import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Package } from './entities/package.entity';
import { Feature } from './entities/feature.entity';
import { PackageFeature } from './entities/package-feature.entity';
import { Subscription } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';

import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GetAllPackagesDto } from './dto/get-all-packages.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { BillingCycle, SubscriptionStatus } from '../lib/enums/subscription-plan.enum';

import { UserProvider } from '../user/user.provider';
import { User } from '../user/entities/user.entity';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

type JobSubscriptionRes = {
  limit?: string;
  id: number;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(Feature) private featureRepo: Repository<Feature>,
    @InjectRepository(PackageFeature) private packageFeatureRepo: Repository<PackageFeature>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    private readonly userProvider: UserProvider,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is missing');
    this.stripe = new Stripe(secretKey);
  }

  private static readonly DEFAULT_TRIAL_PACKAGE_COMPANY = 1;
  private static readonly DEFAULT_TRIAL_PACKAGE_CANDIDATE = 8;
  private static readonly DEFAULT_TRIAL_MONTHS = 24;

  private async resolveTrialPackageId(userId: string): Promise<number> {
    const candidateTrialId =
      Number(this.config.get('TRIAL_PACKAGE_ID_CANDIDATE')) ||
      SubscriptionService.DEFAULT_TRIAL_PACKAGE_CANDIDATE;
    const companyTrialId =
      Number(this.config.get('TRIAL_PACKAGE_ID_COMPANY')) ||
      SubscriptionService.DEFAULT_TRIAL_PACKAGE_COMPANY;

    const user = await this.userProvider.findOne(userId);
    const role = String(user?.role || '').toUpperCase();
    const chosen = role === 'COMPANY' ? companyTrialId : candidateTrialId;

    this.logger.log(`[TRIAL] userId=${userId} role=${role || 'UNKNOWN'} -> packageId=${chosen}`);

    return chosen;
  }

  async activateTrial(userId: string): Promise<Subscription> {
    this.logger.log(`[TRIAL] activateTrial called for userId=${userId}`);

    const existingTrial = await this.subscriptionRepo.findOne({
      where: { userId, isTrial: true },
    });
    if (existingTrial) {
      this.logger.log(
        `[TRIAL] existing trial found (id=${existingTrial.id}, packageId=${existingTrial.packageId}, status=${existingTrial.status}) — skipping creation`,
      );
      return existingTrial;
    }

    const trialPackageId = await this.resolveTrialPackageId(userId);

    const premiumPackage = await this.packageRepo.findOne({ where: { id: trialPackageId } });
    if (!premiumPackage) {
      this.logger.error(`[TRIAL] package id=${trialPackageId} NOT FOUND in packages table`);
      throw new BadRequestException('Premium package not found');
    }
    this.logger.log(`[TRIAL] using package id=${premiumPackage.id} title=${(premiumPackage as any).title ?? ''}`);

    await this.subscriptionRepo.update(
      { userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.SUPERSEDED },
    );

    const trialMonths =
      Number(this.config.get('TRIAL_DURATION_MONTHS')) ||
      SubscriptionService.DEFAULT_TRIAL_MONTHS;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + trialMonths);

    const trial = this.subscriptionRepo.create({
      userId,
      packageId: premiumPackage.id,
      billingCycle: BillingCycle.MONTHLY,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      isTrial: true,
      stripeSubscriptionId: null,
      createdBy: userId,
    });

    const saved = await this.subscriptionRepo.save(trial);
    this.logger.log(
      `[TRIAL] CREATED subscriptionId=${saved.id} userId=${userId} packageId=${saved.packageId} months=${trialMonths} expires=${endDate.toDateString()}`,
    );

    return saved;
  }

  async expireTrials(): Promise<void> {
    const now = new Date();
    const expiredTrials = await this.subscriptionRepo
      .createQueryBuilder('subscription')
      .where('subscription.isTrial = true')
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.endDate <= :now', { now })
      .getMany();

    if (!expiredTrials.length) return;
    this.logger.log(`Found ${expiredTrials.length} expired trials`);
    for (const trial of expiredTrials) {
      await this.subscriptionRepo.update(trial.id, { status: SubscriptionStatus.EXPIRED });
      this.logger.log(`Trial expired for userId: ${trial.userId}`);
    }
  }

  async createPackage(dto: CreatePackageDto) {
    try {
      const pkg = this.packageRepo.create(dto);
      return await this.packageRepo.save(pkg);
    } catch (error) { handleDBError(error); }
  }

  async findAllPackages(query: GetAllPackagesDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = query;
      const qb = this.packageRepo
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.features', 'packageFeature')
        .leftJoinAndSelect('packageFeature.feature', 'feature')
        .select(['package', 'packageFeature', 'feature']);

      if (search) {
        qb.andWhere(`(LOWER(package.name) LIKE :search OR LOWER(package.description) LIKE :search)`,
          { search: `%${search.toLowerCase()}%` });
      }
      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`package.${field} = :${field}`, { [field]: filters[field] });
        });
      }
      qb.orderBy(`package.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);
      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) { handleDBError(error); }
  }

  async findAllSubscriptions(query: GetAllPackagesDto) {
    const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search, role } = query;
    const qb = this.subscriptionRepo
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.package', 'package')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('package.features', 'packageFeature')
      .leftJoinAndSelect('packageFeature.feature', 'feature')
      .where('subscription.deletedAt IS NULL');

    if (search) {
      qb.andWhere(`(LOWER(package.title) LIKE :search OR LOWER(package.description) LIKE :search)`,
        { search: `%${search.toLowerCase()}%` });
    }
    if (filters) {
      const allowedFields = ['status', 'billingCycle', 'userId', 'packageId'];
      Object.keys(filters).forEach((field) => {
        if (allowedFields.includes(field)) {
          qb.andWhere(`subscription.${field} = :${field}`, { [field]: filters[field] });
        }
      });
    }
    if (role) qb.andWhere('user.role = :role', { role });

    qb.orderBy(`subscription.${sortBy}`, order === 'DESC' ? 'DESC' : 'ASC');
    qb.skip((+page - 1) * +limit).take(+limit);
    const [subscriptions, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      subscriptions.map(async (sub) => {
        const latestPayment = await this.paymentRepo.findOne({
          where: { subscriptionId: sub.id },
          order: { createdAt: 'DESC' },
        });
        return {
          ...sub,
          latestInvoice: latestPayment ? {
            invoiceId: latestPayment.invoiceId,
            invoiceNumber: latestPayment.invoiceNumber,
            hostedInvoiceUrl: latestPayment.hostedInvoiceUrl,
            invoicePdf: latestPayment.invoicePdf,
          } : null,
        };
      }),
    );
    return { data, total, page: +page, limit: +limit };
  }

  async findSubscriptionByUser(userId: string) {
    return await this.subscriptionRepo
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('subscription.package', 'package')
      .leftJoinAndSelect('package.features', 'packageFeature')
      .leftJoinAndSelect('packageFeature.feature', 'feature')
      .leftJoinAndSelect('subscription.payments', 'payment')
      .where('subscription.userId = :userId', { userId })
      .andWhere('subscription.deletedAt IS NULL')
      .orderBy('subscription.createdAt', 'DESC')
      .getOne();
  }

  async updateSubscription(id: number, dto: UpdateSubscriptionDto) {
    try {
      await this.subscriptionRepo.update(id, dto);
      return await this.subscriptionRepo.findOne({ where: { id }, relations: ['package'] });
    } catch (error) { handleDBError(error); }
  }

  async updatePackage(id: number, dto: UpdatePackageDto) {
    try {
      await this.packageRepo.update(id, dto);
      return await this.packageRepo.findOne({ where: { id }, relations: ['features'] });
    } catch (error) { handleDBError(error); }
  }

  async deletePackage(id: number, deletedBy: string) {
    try {
      await this.packageRepo.update(id, { deletedBy });
      return await this.packageRepo.softDelete(id);
    } catch (error) { handleDBError(error); }
  }

  async addFeature(dto: CreateFeatureDto) {
    try {
      const feature = this.packageFeatureRepo.create(dto);
      return await this.packageFeatureRepo.save(feature);
    } catch (error) { handleDBError(error); }
  }

  async updateFeature(id: number, dto: UpdateFeatureDto) {
    try {
      await this.packageFeatureRepo.update(id, dto);
      return await this.packageFeatureRepo.findOne({ where: { id }, relations: ['feature'] });
    } catch (error) { handleDBError(error); }
  }

  async deleteFeature(id: number, deletedBy: string) {
    try {
      await this.packageFeatureRepo.update(id, { deletedBy });
      return await this.packageFeatureRepo.softDelete(id);
    } catch (error) { handleDBError(error); }
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (dto.billingCycle === BillingCycle.MONTHLY) endDate.setMonth(endDate.getMonth() + 1);
      if (dto.billingCycle === BillingCycle.QUARTERLY) endDate.setMonth(endDate.getMonth() + 3);
      if (dto.billingCycle === BillingCycle.ANNUALLY) endDate.setFullYear(endDate.getFullYear() + 1);

      const sub = this.subscriptionRepo.create({ ...dto, startDate, endDate, status: SubscriptionStatus.ACTIVE });
      const subscription = await this.subscriptionRepo.save(sub);

      const pkg = await this.packageRepo.findOne({ where: { id: dto.packageId } });
      if (!pkg) throw new BadRequestException('Invalid package selected');

      const user = await this.userProvider.findOne(dto.userId);
      if (!user) throw new BadRequestException('Invalid user');

      const customer = await this.createOrGetCustomer(user);

      let price = 0;
      if (dto.billingCycle === BillingCycle.MONTHLY) price = pkg.monthlyPrice;
      else if (dto.billingCycle === BillingCycle.QUARTERLY) price = pkg.quarterlyPrice;
      else if (dto.billingCycle === BillingCycle.ANNUALLY) price = pkg.annualPrice;

      if (price === undefined || price === null)
        throw new BadRequestException('Package price not found for selected billing cycle');

      return await this.createCheckoutSession({
        customerId: customer.id,
        currency: 'usd',
        amount: Math.round(price * 100),
        successUrl: `${dto.successUrl}?subscriptionId=${subscription.id}`,
        cancelUrl: `${dto.cancelUrl || dto.successUrl}?subscriptionId=${subscription.id}`,
        subscriptionId: subscription.id,
      });
    } catch (error) { handleDBError(error); }
  }

  async recordPayment(dto: CreatePaymentDto) {
    try {
      const payment = this.paymentRepo.create({ ...dto, paymentDate: new Date() });
      return await this.paymentRepo.save(payment);
    } catch (error) { handleDBError(error); }
  }

  async confirmPayment(referenceNo: string) {
    try {
      const payment = await this.paymentRepo.findOne({ where: { referenceNo }, relations: ['subscription'] });
      if (!payment) throw new NotFoundException('Payment not found');
      const sub = payment.subscription;
      if (sub.status === SubscriptionStatus.EXPIRED) { sub.startDate = new Date(); sub.endDate = new Date(); }
      if (sub.billingCycle === BillingCycle.MONTHLY) sub.endDate.setMonth(sub.endDate.getMonth() + 1);
      if (sub.billingCycle === BillingCycle.QUARTERLY) sub.endDate.setMonth(sub.endDate.getMonth() + 3);
      if (sub.billingCycle === BillingCycle.ANNUALLY) sub.endDate.setFullYear(sub.endDate.getFullYear() + 1);
      return await this.subscriptionRepo.save(sub);
    } catch (error) { handleDBError(error); }
  }

  async countActive(): Promise<number> {
    return this.subscriptionRepo.count({ where: { status: SubscriptionStatus.ACTIVE } });
  }

  async createOrGetCustomer(user: User) {
    const existingCustomerId = user.stripeCustomerId;
    if (existingCustomerId) {
      try {
        const existing = await this.stripe.customers.retrieve(existingCustomerId);
        if (!('deleted' in existing)) return existing;
      } catch {}
    }
    const customer = await this.stripe.customers.create({ email: user.email });
    await this.userProvider.updateUser(user.id, { stripeCustomerId: customer.id });
    return customer;
  }

  async createCheckoutSession(dto: any) {
    return await this.stripe.checkout.sessions.create({
      customer: dto.customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: dto.currency,
            product_data: { name: 'Subscription Plan' },
            unit_amount: dto.amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { subscriptionId: dto.subscriptionId.toString() },
    });
  }

  private extractPaymentIntentId(invoice: any): string | null {
    if (!invoice) return null;

    const legacy = invoice.payment_intent;
    if (legacy) {
      return typeof legacy === 'string' ? legacy : (legacy.id ?? null);
    }

    const fromPayments =
      invoice.payments?.data?.[0]?.payment?.payment_intent ??
      invoice.payments?.[0]?.payment?.payment_intent ??
      null;

    if (fromPayments) {
      return typeof fromPayments === 'string' ? fromPayments : (fromPayments.id ?? null);
    }

    return null;
  }

  private async extractCardDetails(
    paymentIntentId: string | null,
    customerId: string | null,
  ): Promise<{
    cardLastFourDigit: string | null;
    cardholderName: string | null;
    expiryMonth: number | null;
    expiryYear: number | null;
    cardBrand: string | null;
  }> {
    const empty = {
      cardLastFourDigit: null,
      cardholderName: null,
      expiryMonth: null,
      expiryYear: null,
      cardBrand: null,
    };

    try {
      let charge: any = null;

      if (paymentIntentId) {
        const charges = await this.stripe.charges.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        charge = charges.data?.[0] ?? null;
      }

      if (!charge && customerId) {
        const charges = await this.stripe.charges.list({
          customer: customerId,
          limit: 1,
        });
        charge = charges.data?.[0] ?? null;
      }

      if (charge) {
        const card = charge.payment_method_details?.card;
        return {
          cardLastFourDigit: card?.last4 ?? null,
          cardholderName: charge.billing_details?.name ?? null,
          expiryMonth: card?.exp_month ?? null,
          expiryYear: card?.exp_year ?? null,
          cardBrand: card?.brand ?? null,
        };
      }

      if (customerId) {
        const methods = await this.stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
          limit: 1,
        });
        const pm = methods.data?.[0];
        if (pm?.card) {
          return {
            cardLastFourDigit: pm.card.last4 ?? null,
            cardholderName: pm.billing_details?.name ?? null,
            expiryMonth: pm.card.exp_month ?? null,
            expiryYear: pm.card.exp_year ?? null,
            cardBrand: pm.card.brand ?? null,
          };
        }
      }

      return empty;
    } catch (err: any) {
      this.logger.error(`Card extraction failed: ${err?.message}`);
      return empty;
    }
  }

  async constructWebhookEvent(rawBody: Buffer, sig: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET in configuration');
    return this.stripe.webhooks.constructEvent(rawBody, sig, secret);
  }

  async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== 'subscription') break;

          const subscriptionIdRaw = session.metadata?.subscriptionId;
          if (!subscriptionIdRaw) return;
          const subscriptionId = Number(subscriptionIdRaw);
          if (isNaN(subscriptionId)) return;

          const stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription : (session.subscription as any)?.id ?? null;

          if (stripeSubscriptionId) {
            await this.subscriptionRepo.update(subscriptionId, { stripeSubscriptionId });
          }

          try {
            let invoiceId: string | null = null;
            let paymentIntentId: string | null = null;
            let amount = 0, currency = 'usd', status = 'paid';

            const customerId =
              typeof session.customer === 'string'
                ? session.customer
                : ((session.customer as any)?.id ?? null);

            let card = {
              cardLastFourDigit: null as string | null,
              cardholderName: null as string | null,
              expiryMonth: null as number | null,
              expiryYear: null as number | null,
              cardBrand: null as string | null,
            };

            if (stripeSubscriptionId) {
              try {
                const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
                  expand: ['latest_invoice', 'latest_invoice.payments'],
                });
                const latestInvoice = (stripeSub as any).latest_invoice;
                if (latestInvoice) {
                  invoiceId = latestInvoice.id ?? null;
                  amount    = latestInvoice.amount_paid ? latestInvoice.amount_paid / 100 : 0;
                  currency  = latestInvoice.currency ?? 'usd';
                  status    = latestInvoice.status ?? 'paid';
                  paymentIntentId = this.extractPaymentIntentId(latestInvoice);
                }
                card = await this.extractCardDetails(paymentIntentId, customerId);
              } catch (subErr) {
                this.logger.error(`Subscription retrieve failed: ${(subErr as any)?.message}`);
              }
            }

            const { cardLastFourDigit, cardholderName, expiryMonth, expiryYear, cardBrand } = card;

            const existingPayment = await this.paymentRepo.findOne({ where: { subscriptionId } });
            if (!existingPayment) {
              const payment = this.paymentRepo.create({
                subscriptionId,
                stripeSubscriptionId: stripeSubscriptionId ?? undefined,
                customerId,
                paymentIntentId, amount, currency, status, invoiceId,
                paymentDate: new Date(),
                cardLastFourDigit, cardholderName, expiryMonth, expiryYear, cardBrand,
              });
              await this.paymentRepo.save(payment);
              this.logger.log(`Payment saved (card: ${cardLastFourDigit ?? 'none'})`);
            } else if (!existingPayment.cardLastFourDigit && cardLastFourDigit) {
              await this.paymentRepo.update(existingPayment.id, {
                cardLastFourDigit, cardholderName, expiryMonth, expiryYear, cardBrand,
                paymentIntentId: paymentIntentId ?? existingPayment.paymentIntentId,
                invoiceId: invoiceId ?? existingPayment.invoiceId,
              });
              this.logger.log(`Payment card details updated (card: ${cardLastFourDigit})`);
            }
            await this.subscriptionRepo.update(subscriptionId, { status: SubscriptionStatus.ACTIVE });
            this.logger.log('Paid subscription activated');
          } catch (err) {
            this.logger.error(`Payment save failed: ${(err as any)?.message}`);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice: any = event.data.object;
          let stripeSubscriptionId: string | null = null;
          if (invoice.subscription) stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (!stripeSubscriptionId && invoice.parent?.subscription_details?.subscription) stripeSubscriptionId = invoice.parent.subscription_details.subscription;
          if (!stripeSubscriptionId && invoice.lines?.data?.length > 0) stripeSubscriptionId = invoice.lines.data[0]?.subscription ?? null;
          if (!stripeSubscriptionId) return;

          const subscription = await this.subscriptionRepo.findOne({ where: { stripeSubscriptionId } });
          if (!subscription) return;

          const existingPayment = await this.paymentRepo.findOne({ where: { invoiceId: invoice.id } });
          if (existingPayment) return;

          const customerId =
            typeof invoice.customer === 'string'
              ? invoice.customer
              : ((invoice.customer as any)?.id ?? null);

          let paymentIntentId = this.extractPaymentIntentId(invoice);

          if (!paymentIntentId && stripeSubscriptionId) {
            try {
              const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
                expand: ['latest_invoice', 'latest_invoice.payments'],
              });
              const li = (stripeSub as any).latest_invoice;
              paymentIntentId = this.extractPaymentIntentId(li);
            } catch {}
          }

          const cardInfo = await this.extractCardDetails(paymentIntentId, customerId);
          const { cardLastFourDigit, cardholderName, expiryMonth, expiryYear, cardBrand } = cardInfo;

          const payment = this.paymentRepo.create({
            subscriptionId: subscription.id,
            stripeSubscriptionId,
            customerId,
            paymentIntentId,
            amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
            currency: invoice.currency ?? null,
            status: invoice.status ?? null,
            invoiceId: invoice.id ?? null,
            invoiceNumber: invoice.number ?? null,
            hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
            invoicePdf: invoice.invoice_pdf ?? null,
            paymentDate: new Date(),
            cardLastFourDigit, cardholderName, expiryMonth, expiryYear, cardBrand,
          });
          await this.paymentRepo.save(payment);
          await this.subscriptionRepo.update(subscription.id, { status: SubscriptionStatus.ACTIVE });
          this.logger.log(`Invoice payment saved (card: ${cardLastFourDigit ?? 'none'})`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice: any = event.data.object;
          let stripeSubscriptionId: string | null = null;
          if (invoice.subscription) stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (!stripeSubscriptionId && invoice.parent?.subscription_details?.subscription) stripeSubscriptionId = invoice.parent.subscription_details.subscription;
          if (!stripeSubscriptionId && invoice.lines?.data?.length > 0) stripeSubscriptionId = invoice.lines.data[0]?.subscription ?? null;
          if (!stripeSubscriptionId) return;
          const subscription = await this.subscriptionRepo.findOne({ where: { stripeSubscriptionId } });
          if (!subscription) return;
          await this.subscriptionRepo.update(subscription.id, { status: SubscriptionStatus.INACTIVE });
          break;
        }

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${(error as any)?.message}`);
    }
  }

  async adminPurchasePackage(userId: string, packageId: number, billingCycle: BillingCycle, adminId: string) {
    try {
      const user = await this.userProvider.findOne(userId);
      if (!user) throw new BadRequestException('Invalid user');
      const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
      if (!pkg) throw new BadRequestException('Invalid package');

      await this.subscriptionRepo.update({ userId, status: SubscriptionStatus.ACTIVE }, { status: SubscriptionStatus.SUPERSEDED });

      const startDate = new Date();
      const endDate = new Date(startDate);
      if (billingCycle === BillingCycle.MONTHLY) endDate.setMonth(endDate.getMonth() + 1);
      if (billingCycle === BillingCycle.QUARTERLY) endDate.setMonth(endDate.getMonth() + 3);
      if (billingCycle === BillingCycle.ANNUALLY) endDate.setFullYear(endDate.getFullYear() + 1);

      let price = 0;
      if (billingCycle === BillingCycle.MONTHLY) price = pkg.monthlyPrice;
      if (billingCycle === BillingCycle.QUARTERLY) price = pkg.quarterlyPrice;
      if (billingCycle === BillingCycle.ANNUALLY) price = pkg.annualPrice;

      const subscription = this.subscriptionRepo.create({
        userId, packageId, billingCycle, startDate, endDate,
        status: SubscriptionStatus.ACTIVE, stripeSubscriptionId: null, createdBy: adminId,
      });
      const savedSub = await this.subscriptionRepo.save(subscription);

      const payment = this.paymentRepo.create({
        subscriptionId: savedSub.id, amount: price ?? 0, currency: 'usd',
        status: 'MANUAL', referenceNo: `ADMIN-${Date.now()}`,
        paymentDate: new Date(), createdBy: adminId,
      });
      await this.paymentRepo.save(payment);
      return savedSub;
    } catch (error) { handleDBError(error); }
  }

  async superSeedCurrentSubscription(subscriptionId: number) {
    const newSubscription = await this.subscriptionRepo.findOne({ where: { id: subscriptionId }, relations: ['user'] });
    if (!newSubscription) {
      this.logger.error(`Subscription ${subscriptionId} not found.`);
      return;
    }
    await this.subscriptionRepo.update({ userId: newSubscription.userId, status: SubscriptionStatus.ACTIVE }, { status: SubscriptionStatus.SUPERSEDED });
    newSubscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepo.save(newSubscription);
  }

  async getFeatureLimit(userId: string, featureId: number): Promise<JobSubscriptionRes | null> {
    const subscription = await this.subscriptionRepo
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.package', 'package')
      .leftJoinAndSelect('package.features', 'packageFeature')
      .leftJoinAndSelect('packageFeature.feature', 'feature')
      .leftJoin('subscription.user', 'user')
      .leftJoin('user.company', 'company')
      .where('user.id = :userId', { userId })
      .andWhere("subscription.status = 'ACTIVE'")
      .orderBy('subscription.createdAt', 'DESC')
      .getOne();

    if (!subscription) return null;
    const feature = subscription.package.features.find((pf) => pf.featureId === featureId);
    return { limit: feature?.limit ?? undefined, id: subscription.id };
  }
}