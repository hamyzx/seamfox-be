import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanBoard } from './entities/kanban-board.entity';
import { KanbanBoardCoreStatus } from './entities/kanban-board-core-status.entity';
import { KanbanBoardStatus } from './entities/kanban-board-status.entity';
import { CreateKanbanBoardDto } from './dto/create-kanban-board.dto';
import { CreateKanbanColumnDto } from './dto/create-kanban-column.dto';
import { UpdateKanbanColumnDto } from './dto/update-kanban-column.dto';
import { handleDBError } from '../../lib/error/dataBaseError';
import { DataSource } from 'typeorm';

@Injectable()
export class KanbanBoardService {
  constructor(
    @InjectRepository(KanbanBoard)
    private boardRepo: Repository<KanbanBoard>,

    @InjectRepository(KanbanBoardCoreStatus)
    private coreStatusRepo: Repository<KanbanBoardCoreStatus>,

    @InjectRepository(KanbanBoardStatus)
    private statusRepo: Repository<KanbanBoardStatus>,

    private readonly dataSource: DataSource,
  ) {}

  async createBoard(dto: CreateKanbanBoardDto) {
    return this.dataSource.transaction(async (manager) => {
      try {
        const boardRepo = manager.getRepository(KanbanBoard);
        const coreStatusRepo = manager.getRepository(KanbanBoardCoreStatus);
        const statusRepo = manager.getRepository(KanbanBoardStatus);

        const board = boardRepo.create(dto);
        await boardRepo.save(board);

        const defaultStatuses = await coreStatusRepo.find();

        const statuses = defaultStatuses.map((s) =>
          statusRepo.create({
            name: s.name,
            order: s.order,
            isDefault: true,
            kanbanBoardId: board.id,
            jobCoreStatusId: s.id,
          }),
        );

        await statusRepo.save(statuses);

        return boardRepo.findOne({
          where: { id: board.id },
          relations: ['statuses'],
          order: { statuses: { order: 'ASC' } },
        });
      } catch (error) {
        handleDBError(error);
      }
    });
  }

  async getBoard(companyId: number) {
    const result = await this.boardRepo.findOne({
      where: { companyId },
      relations: ['statuses'],
      order: { statuses: { order: 'ASC' } },
    });
    if (!result) throw new NotFoundException(`Board for provided company not found`);
    return result;
  }

  async getBoardById(id: number) {
    const result = await this.boardRepo.findOne({
      where: { id },
      relations: ['statuses', 'statuses.coreStatus'],
      order: { statuses: { order: 'ASC' } },
    });
    if (!result) throw new NotFoundException(`Board for provided company not found`);
    return result;
  }

  // ── Get existing "Shortlisted" column (default core column) ──────────────
  // Used when company clicks "Shortlist" — no new column created
  async getShortlistedColumn(boardId: number): Promise<KanbanBoardStatus> {
    // Try by name (could be "Shortlisted" or "Shortlist" default)
    const byName = await this.statusRepo
      .createQueryBuilder('s')
      .where('s.kanbanBoardId = :boardId', { boardId })
      .andWhere('LOWER(s.name) IN (:...names)', {
        names: ['shortlisted', 'shortlist'],
      })
      .andWhere('s.isDefault = true') // ✅ Only default column
      .orderBy('s.order', 'ASC')
      .getOne();

    if (byName) return byName;

    // Fallback — order 2 is always the Shortlisted default column
    const byOrder = await this.statusRepo.findOne({
      where: { kanbanBoardId: boardId, order: 2, isDefault: true },
    });

    if (byOrder) return byOrder;

    throw new NotFoundException('Shortlisted column not found on this board');
  }

  // ── Ensure a "Review List" column exists ─────────────────────────────────
  // Inserted BEFORE "Shortlisted" column so the flow is:
  // Applied → Review List → Shortlisted → Interview → Hired → Rejected
  async ensureReviewListColumn(boardId: number): Promise<KanbanBoardStatus> {
    // Already exists?
    const existing = await this.statusRepo
      .createQueryBuilder('s')
      .where('s.kanbanBoardId = :boardId', { boardId })
      .andWhere('LOWER(s.name) = :name', { name: 'review list' })
      .getOne();

    if (existing) return existing;

    // Find the "Shortlisted" default column (order 2)
    const shortlistedCol = await this.statusRepo.findOne({
      where: { kanbanBoardId: boardId, isDefault: true, order: 2 },
    });

    // Insert position = just before Shortlisted (order 2), so insert at order 2
    // and shift everything >= 2 up by 1
    const insertAtOrder = shortlistedCol ? shortlistedCol.order : 2;

    return this.dataSource.transaction(async (manager) => {
      const statusRepo = manager.getRepository(KanbanBoardStatus);

      // Shift all statuses with order >= insertAtOrder up by 1
      const toShift = await statusRepo.find({
        where: { kanbanBoardId: boardId },
        order: { order: 'ASC' },
      });

      const shifted = toShift
        .filter((s) => s.order >= insertAtOrder)
        .sort((a, b) => b.order - a.order); // DESC to avoid conflicts

      for (const s of shifted) {
        s.order += 1;
      }
      await statusRepo.save(shifted);

      // Create Review List column at the insert position
      const reviewListCol = statusRepo.create({
        name: 'Review List',
        order: insertAtOrder,
        kanbanBoardId: boardId,
        isDefault: false,
        jobCoreStatusId: shortlistedCol?.jobCoreStatusId ?? 1,
      });

      return statusRepo.save(reviewListCol);
    });
  }

  async addColumn(dto: CreateKanbanColumnDto) {
    try {
      return this.dataSource.transaction(async (manager) => {
        const kanbanBoardRepo = manager.getRepository(KanbanBoard);
        const statusRepo = manager.getRepository(KanbanBoardStatus);

        const board = await kanbanBoardRepo.findOne({
          where: { id: dto.kanbanBoardId },
          relations: ['statuses'],
        });

        if (!board) throw new NotFoundException('Board not found');

        const allStatuses = await statusRepo.find({
          where: { kanbanBoardId: dto.kanbanBoardId },
          order: { order: 'ASC' },
        });

        allStatuses.forEach((s, index) => { s.order = index + 1; });
        await statusRepo.save(allStatuses);

        const maxOrder = allStatuses.length;
        const insertOrder = Math.min(dto.order, maxOrder + 1);

        const statusesToShift = allStatuses
          .filter((s) => s.order >= insertOrder)
          .sort((a, b) => b.order - a.order);
        statusesToShift.forEach((s) => { s.order += 1; });
        await statusRepo.save(statusesToShift);

        const coreStatusId =
          insertOrder > 1
            ? allStatuses.find((item) => item.order == insertOrder - 1)?.jobCoreStatusId
            : 1;

        const newStatus = statusRepo.create({
          name: dto.name,
          order: insertOrder,
          kanbanBoardId: dto.kanbanBoardId,
          isDefault: false,
          jobCoreStatusId: coreStatusId,
        });
        await statusRepo.save(newStatus);

        return statusRepo.find({
          where: { kanbanBoardId: dto.kanbanBoardId },
          order: { order: 'ASC' },
        });
      });
    } catch (error) {
      console.log(error);
      handleDBError(error);
    }
  }

  async updateColumn(id: number, dto: UpdateKanbanColumnDto) {
    try {
      return this.dataSource.transaction(async (manager) => {
        const statusRepo = manager.getRepository(KanbanBoardStatus);

        const status = await statusRepo.findOne({ where: { id } });
        if (!status) throw new NotFoundException('Column not found');

        if (status.isDefault) {
          throw new BadRequestException('Default columns cannot be modified');
        }

        if (dto.name !== undefined) {
          status.name = dto.name;
        }

        if (dto.order !== undefined && dto.order !== status.order) {
          const allStatuses = await statusRepo.find({
            where: { kanbanBoardId: status.kanbanBoardId },
            order: { order: 'ASC' },
          });

          allStatuses.forEach((s, index) => (s.order = index + 1));
          await statusRepo.save(allStatuses);

          const remaining = allStatuses.filter((s) => s.id !== status.id);
          const newOrder = Math.min(dto.order, remaining.length + 1);
          remaining.splice(newOrder - 1, 0, status);

          remaining.forEach((s, idx) => (s.order = idx + 1000));
          await statusRepo.save(remaining);

          remaining.forEach((s, idx) => {
            s.order = idx + 1;
            if (!s.isDefault) {
              s.jobCoreStatusId = idx > 0 ? remaining[idx - 1].jobCoreStatusId : 1;
            }
          });
          await statusRepo.save(remaining);

          status.order = newOrder;
        }

        return await statusRepo.save(status);
      });
    } catch (error) {
      console.log(error);
      handleDBError(error);
    }
  }

  async deleteStatusColumn(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const statusRepo = manager.getRepository(KanbanBoardStatus);

      const status = await statusRepo.findOne({ where: { id } });
      if (!status) throw new NotFoundException('Column not found');

      if (status.isDefault) {
        throw new BadRequestException('Default columns cannot be deleted');
      }

      const boardId = status.kanbanBoardId;
      await statusRepo.delete(status.id);

      const remaining = await statusRepo.find({
        where: { kanbanBoardId: boardId },
        order: { order: 'ASC' },
      });

      remaining.forEach((s, idx) => (s.order = idx + 1));
      await statusRepo.save(remaining);
      return { success: true };
    });
  }

  async getCoreStatus() {
    return this.coreStatusRepo.find({ order: { order: 'ASC' } });
  }

  // ── Create kanban board for admin jobs ───────────────────────────────────
  async createAdminJobBoard() {
    try {
      // Step 1: Insert board using raw SQL
      const boardResult = await this.dataSource.query(
        `INSERT INTO kanban_board (name) VALUES ($1) RETURNING id`,
        ['Admin Job Board'],
      );
      const boardId = boardResult[0].id;

      // Step 2: Get core statuses
      const coreStatuses = await this.dataSource.query(
        `SELECT id, name, "order" FROM kanban_board_core_status ORDER BY "order" ASC`,
      );

      // Step 3: Insert statuses one by one with explicit error handling
      for (const s of coreStatuses) {
        try {
          await this.dataSource.query(
            `INSERT INTO kanban_board_status (name, "order", "isDefault", "kanbanBoardId", "jobCoreStatusId") 
             VALUES ($1, $2, $3, $4, $5)`,
            [s.name, s.order, true, boardId, s.id],
          );
        } catch (err: any) {
          // If duplicate, skip it (status already exists)
          if (!err.message?.includes('Duplicate') && !err.message?.includes('duplicate')) {
            throw err;
          }
          // Otherwise ignore duplicate error
        }
      }

      // Step 4: Return the board with relations
      return this.boardRepo.findOne({
        where: { id: boardId },
        relations: ['statuses'],
        order: { statuses: { order: 'ASC' } },
      });
    } catch (error: any) {
      // Don't call handleDBError for duplicate errors
      if (error.message?.includes('Duplicate') || error.message?.includes('duplicate')) {
        throw new BadRequestException('Kanban board statuses already exist');
      }
      handleDBError(error);
    }
  }
}