import { forwardRef, Inject, Injectable, Optional } from '@nestjs/common';
import { MediaService } from './media.service';
import { ConfigService } from '@nestjs/config';
import { FolderNames } from '../lib/enums/media.enum';
import Anthropic from '@anthropic-ai/sdk';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, BorderStyle, WidthType, Table, TableRow, TableCell, LevelFormat, VerticalAlign, TableLayoutType, TabStopType, } from 'docx';
import { CandidateService } from '../candidate/candidate.service';
import { Repository } from 'typeorm';
import { Candidate } from '../candidate/entities/candidate.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ResumeService } from '../resume/resume.service';
import { Resume } from '../resume/entities/resume.entity';
import { LOGO_B64, LOGO_WM_B64, AVATAR_B64, NAVY_BAR_B64, HLINE_NAVY_B64, BOTTOM_BAR_B64, ICON_EMAIL_B64, ICON_WEB_B64, } from '../lib/constants/constant';
@Injectable()
export class MediaProvider {
    private claude: Anthropic;
    constructor(private readonly mediaService: MediaService, private readonly configService: ConfigService, 
    @InjectQueue('cv-processing')
    private readonly cvQueue: Queue, 
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>, 
    @InjectRepository(Resume)
    private readonly resumeRepo?: Repository<Resume>) {
        this.claude = new Anthropic({
            apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
        });
    }
    private async cleanPng(buf: Buffer): Promise<Buffer> {
        try {
            const sharp = require('sharp');
            try {
                return await sharp(buf, { failOn: 'none' }).png({ compressionLevel: 9 }).toBuffer();
            }
            catch {
                return await sharp(buf, { failOnError: false }).png({ compressionLevel: 9 }).toBuffer();
            }
        }
        catch (e: any) {
            console.error('[cleanPng] re-encode failed, using original buffer:', e?.message);
            return buf;
        }
    }
    async createFile(file: Express.Multer.File, folderName?: FolderNames) {
        return this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.size);
    }
    async createFileCandidate(file: Express.Multer.File, folderName: FolderNames = FolderNames.DEFAULT, candidateId?: number, candidateProfileImage?: string | null) {
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();
        const isCv = ['pdf', 'docx'].includes(fileExt ?? '');
        const originalKey = await this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.size);
        const originalUrl = this.getMediaUrl(originalKey);
        if (!isCv)
            return { originalKey, originalUrl };
        const result = await this.processCvAsPdf({ originalname: file.originalname, buffer: file.buffer }, originalKey, folderName, candidateProfileImage ?? null);
        let finalKey: string | null = result.processedKey;
        let originalResumeKey: string | null = originalKey;
        if (result.processedKey && this.resumeRepo && candidateId) {
            const movedKey = await this.mediaService.moveFile(FolderNames.RESUME, result.processedKey);
            finalKey = movedKey;
            try {
                const originalPdf = await this.convertToPdf({ originalname: file.originalname, buffer: file.buffer }, FolderNames.RESUME);
                originalResumeKey = originalPdf.key ?? originalKey;
            }
            catch (err: any) {
                console.warn('[createFileCandidate] original PDF convert failed, keeping original key:', err?.message);
                originalResumeKey = originalKey;
            }
            await this.resumeRepo.manager.transaction(async (em) => {
                await em.update(Resume, { candidateId, isDefault: true }, { isDefault: false });
                const r = em.create(Resume, {
                    candidateId,
                    filePath: movedKey,
                    originalFilePath: originalResumeKey ?? undefined,
                    isDefault: true,
                });
                await em.save(r);
            });
        }
        else {
            console.warn('[createFileCandidate] resume NOT saved - repo?', !!this.resumeRepo, '| candidateId:', candidateId, '| processedKey:', result.processedKey);
        }
        return {
            originalKey,
            originalUrl,
            processedKey: finalKey,
            processedUrl: this.getMediaUrl(finalKey),
            originalResumeKey,
            originalResumeUrl: this.getMediaUrl(originalResumeKey),
            status: 'completed',
        };
    }
    async updateResumeCv(file: Express.Multer.File, resumeId: number, candidateId: number, folderName?: FolderNames) {
        const originalKey = await this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.size);
        const originalUrl = this.getMediaUrl(originalKey);
        const result = await this.processCvAsPdf({ originalname: file.originalname, buffer: file.buffer }, originalKey, folderName ?? FolderNames.DEFAULT, null);
        let finalKey: string | null = result.processedKey;
        if (result.processedKey && this.resumeRepo) {
            const movedKey = await this.mediaService.moveFile(FolderNames.RESUME, result.processedKey);
            finalKey = movedKey;
            await this.resumeRepo.update({ id: resumeId }, { filePath: movedKey });
        }
        return {
            originalKey,
            originalUrl,
            processedKey: finalKey,
            processedUrl: this.getMediaUrl(finalKey),
            status: 'completed-update',
        };
    }
    async parseCvForOnboarding(file: Express.Multer.File) {
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();
        const isCv = ['pdf', 'docx'].includes(fileExt ?? '');
        if (!isCv) {
            throw new Error('Only PDF and DOCX files are supported');
        }
        let extractedText = '';
        if (fileExt === 'pdf') {
            const data = await pdfParse(file.buffer);
            extractedText = data.text;
        }
        else if (fileExt === 'docx') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = result.value;
        }
        if (!extractedText.trim()) {
            throw new Error('No readable text found in CV');
        }
        let photoKey: string | null = null;
        try {
            const photo = await this.extractPhotoFromCv(file.buffer, fileExt ?? '');
            if (photo) {
                const photoFileName = `cv_photo_${Date.now()}.jpg`;
                photoKey = await this.mediaService.uploadFile(photoFileName, photo.buffer, FolderNames.DEFAULT, photo.buffer.length);
            }
        }
        catch (err) {
            console.error('[parseCvForOnboarding] Photo extraction failed:', err);
        }
        const cvKey = await this.mediaService.uploadFile(file.originalname, file.buffer, FolderNames.DEFAULT, file.size);
        const cvUrl = this.getMediaUrl(cvKey);
        const regexData = this.extractWithRegex(extractedText);
        let aiData: any = null;
        let aiSucceeded = false;
        try {
            aiData = await this.tryClaudeParsing(extractedText);
            if (aiData) {
                aiSucceeded = true;
            }
        }
        catch (err: any) {
        }
        const parsedData = this.mergeRegexAndAi(regexData, aiData);
        return {
            parsedData,
            cvKey,
            cvUrl,
            photoKey,
            photoUrl: photoKey ? this.getMediaUrl(photoKey) : null,
            _meta: {
                aiUsed: aiSucceeded,
                textLength: extractedText.length,
            },
        };
    }
    private extractWithRegex(text: string): any {
        return {
            firstName: this.extractFirstName(text),
            lastName: this.extractLastName(text),
            email: this.extractEmail(text),
            phone: this.extractPhone(text),
            address: '',
            country: this.extractCountry(text),
            city: this.extractCity(text),
            linkedinUrl: this.extractLinkedIn(text),
            summary: this.extractSummary(text),
            currentJobTitle: this.extractJobTitle(text),
            currentCompany: '',
            yearsOfExperience: this.extractYearsOfExperience(text),
            skills: this.extractSkills(text),
            languages: this.extractLanguages(text),
            education: [],
            certifications: [],
            experiences: [],
            minSalary: null,
            maxSalary: null,
            currency: '',
        };
    }
    private extractEmail(text: string): string {
        const matches = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
        const emails = matches.filter((e) => !e.toLowerCase().includes('seamfox') &&
            !e.toLowerCase().includes('info@') &&
            !e.toLowerCase().includes('support@'));
        return emails[0] || '';
    }
    private extractPhone(text: string): string {
        const patterns = [
            /\+\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{0,4}/,
            /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/,
            /\d{3}[-\s]\d{3}[-\s]\d{4}/,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match)
                return match[0].trim().replace(/\s+/g, ' ');
        }
        return '';
    }
    private extractLinkedIn(text: string): string {
        const match = text.match(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[\w-]+\/?/i);
        if (match) {
            let url = match[0];
            if (!url.startsWith('http'))
                url = 'https://' + url;
            return url;
        }
        return '';
    }
    private extractYearsOfExperience(text: string): number {
        const patterns = [
            /(\d{1,2})\+?\s*years?\s+of\s+(?:professional\s+)?experience/i,
            /(\d{1,2})\+?\s*years?\s+experience/i,
            /(?:over|with)\s+(\d{1,2})\+?\s*years?/i,
            /experience\s*[:\-]?\s*(\d{1,2})\+?\s*years?/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const years = parseInt(match[1], 10);
                if (years > 0 && years < 50)
                    return years;
            }
        }
        return 0;
    }
    private extractCity(text: string): string {
        try {
            const MAIN_CITIES = require('../lib/constants/main-cities.json');
            const allCities: string[] = [];
            Object.values(MAIN_CITIES).forEach((cities: any) => {
                if (Array.isArray(cities))
                    allCities.push(...cities);
            });
            allCities.sort((a, b) => b.length - a.length);
            for (const city of allCities) {
                const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(text))
                    return city;
            }
        }
        catch (err) {
            console.error('[extractCity] MAIN_CITIES not loaded:', err);
        }
        return '';
    }
    private extractCountry(text: string): string {
        const city = this.extractCity(text);
        if (!city)
            return '';
        try {
            const MAIN_CITIES = require('../lib/main-cities.json');
            for (const [countryCode, cities] of Object.entries(MAIN_CITIES) as any) {
                if (Array.isArray(cities) && cities.includes(city)) {
                    return String(countryCode).toLowerCase();
                }
            }
        }
        catch (err) { }
        return '';
    }
    private extractFirstName(text: string): string {
        const fullName = this.extractFullName(text);
        if (!fullName)
            return '';
        const parts = fullName.split(/\s+/);
        return parts[0] || '';
    }
    private extractLastName(text: string): string {
        const fullName = this.extractFullName(text);
        if (!fullName)
            return '';
        const parts = fullName.split(/\s+/);
        if (parts.length < 2)
            return '';
        return parts.slice(1).join(' ');
    }
    private extractFullName(text: string): string {
        const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
        const skipPatterns = [
            /seamfox/i,
            /resume/i,
            /curriculum/i,
            /vitae/i,
            /^cv$/i,
            /@/,
            /www\./,
            /http/,
            /\d{3}/,
            /office/i,
            /dubai silicon/i,
            /^professional/i,
            /^summary/i,
            /^contact/i,
        ];
        for (const line of lines.slice(0, 15)) {
            if (skipPatterns.some((p) => p.test(line)))
                continue;
            if (line.length < 4 || line.length > 50)
                continue;
            const words = line.split(/\s+/);
            if (words.length < 2 || words.length > 4)
                continue;
            const allCapitalized = words.every((w) => /^[A-ZÀ-Ÿ][a-zà-ÿ'-]+$/.test(w));
            if (!allCapitalized)
                continue;
            return line;
        }
        return '';
    }
    private extractJobTitle(text: string): string {
        const titlePatterns = [
            /\b(?:Senior|Junior|Lead|Principal|Chief)?\s*(?:Software|Web|Mobile|Frontend|Backend|Full[\s-]?Stack)\s+(?:Engineer|Developer|Architect)/i,
            /\b(?:Senior|Junior|Lead)?\s*Data\s+(?:Scientist|Analyst|Engineer)/i,
            /\b(?:Senior|Junior)?\s*Product\s+(?:Manager|Owner|Designer)/i,
            /\b(?:Marketing|Sales|HR|Operations)\s+(?:Manager|Director|Lead|Specialist)/i,
            /\bCommodities?\s+(?:Analyst|Trader|Manager)/i,
            /\bAccountant\b/i,
            /\bAuditor\b/i,
            /\bConsultant\b/i,
            /\b(?:UI|UX|UI\/UX)\s+(?:Designer|Engineer)/i,
            /\bDesigner\b/i,
            /\bManager\b/i,
            /\bDirector\b/i,
        ];
        for (const pattern of titlePatterns) {
            const match = text.match(pattern);
            if (match)
                return match[0].trim();
        }
        return '';
    }
    private extractSummary(text: string): string {
        const patterns = [
            /(?:Professional\s+)?Summary\s*[:\n]+([\s\S]+?)(?:\n\s*\n|\n[A-Z][\w\s]{2,}:|\n\s*(?:Skills|Experience|Education|Work))/i,
            /About\s+(?:Me)?\s*[:\n]+([\s\S]+?)(?:\n\s*\n|\n[A-Z][\w\s]{2,}:)/i,
            /Profile\s*[:\n]+([\s\S]+?)(?:\n\s*\n|\n[A-Z][\w\s]{2,}:)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const summary = match[1].trim().replace(/\s+/g, ' ');
                if (summary.length > 20 && summary.length < 1000) {
                    return `<p>${summary}</p>`;
                }
            }
        }
        return '';
    }
    private extractSkills(text: string): string[] {
        const skillsMatch = text.match(/(?:Key\s+)?Skills\s*[:\n]+([\s\S]+?)(?:\n\s*\n|\n(?:Experience|Education|Languages|Work|Professional))/i);
        if (!skillsMatch)
            return [];
        const skillsText = skillsMatch[1];
        let skills = skillsText
            .split(/[,•\n|·]/)
            .map((s) => s.trim())
            .filter(Boolean);
        skills = skills.filter((s) => s.length > 2 && s.length < 50 && !/^(?:experience|education|work|professional)/i.test(s));
        skills = skills.map((s) => {
            const colonIdx = s.indexOf(':');
            if (colonIdx > 0 && colonIdx < 20)
                return s.substring(colonIdx + 1).trim();
            return s;
        });
        return skills.slice(0, 20);
    }
    private extractLanguages(text: string): string[] {
        const langMatch = text.match(/Languages?\s*[:\n]+([\s\S]+?)(?:\n\s*\n|\n(?:Experience|Education|Skills|References))/i);
        if (!langMatch)
            return [];
        const langText = langMatch[1];
        let languages = langText
            .split(/[,•\n|·]/)
            .map((l) => l.trim())
            .filter(Boolean);
        languages = languages.map((l) => {
            const colonIdx = l.indexOf(':');
            const dashIdx = l.indexOf('-');
            const cutAt = [colonIdx, dashIdx, l.indexOf('(')]
                .filter((i) => i > 0)
                .sort((a, b) => a - b)[0];
            return cutAt > 0 ? l.substring(0, cutAt).trim() : l;
        });
        return languages.filter((l) => l.length > 1 && l.length < 30).slice(0, 10);
    }
    private async tryClaudeParsing(extractedText: string): Promise<any | null> {
        const prompt = `You are a CV parser. Extract candidate info as JSON. Return ONLY valid JSON, no markdown.
 
Schema:
{
  "firstName": "", "lastName": "", "email": "", "phone": "",
  "address": "", "country": "ISO lowercase", "city": "proper case",
  "linkedinUrl": "", "summary": "<p>HTML</p>",
  "currentJobTitle": "", "currentCompany": "", "yearsOfExperience": 0,
  "skills": [], "languages": [],
  "education": [{"institution": "", "degree": "", "major": "", "location": "", "startYear": "YYYY", "endYear": "YYYY"}],
  "certifications": [{"name": "", "issuer": "", "issueYear": "YYYY", "expiryYear": ""}],
  "experiences": [
    {
      "jobTitle": "Senior Software Engineer",
      "companyName": "Google",
      "employmentType": "FULL_TIME",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "isCurrentRole": false,
      "location": "Dubai, UAE",
      "locationType": "ON_SITE",
      "description": "One paragraph summary combining all bullet points (max 500 chars)"
    }
  ],
  "minSalary": null, "maxSalary": null, "currency": ""
}
 
CRITICAL RULES for experiences:
- Find the "Experience" / "Work Experience" / "Professional Experience" / "Employment History" section
- Extract EVERY job listed there, sorted NEWEST first
- Date parsing examples:
  * "Jan 2020 - Present" -> startDate="2020-01-01", isCurrentRole=true, endDate=null
  * "March 2018 - December 2019" -> startDate="2018-03-01", endDate="2019-12-31"
  * "2018 - 2020" -> startDate="2018-01-01", endDate="2020-12-31"
  * "Current" / "Now" / "Present" / "Till date" -> isCurrentRole=true, endDate=null
- employmentType MUST be exactly one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
  * Default to "FULL_TIME" if unclear
  * Use "INTERNSHIP" if role mentions "Intern" or "Internship"
  * Use "CONTRACT" if mentions "Contract" or "Freelance"
- locationType MUST be exactly one of: ON_SITE, REMOTE, HYBRID
  * Default to "ON_SITE" if not specified
  * Use "REMOTE" if mentions "Remote" or "Work from home"
  * Use "HYBRID" if explicitly hybrid
- description: combine ALL bullet points into ONE flowing paragraph (no bullets, no newlines, max 500 chars)
- If no experiences found, return empty array: "experiences": []
- Do NOT invent dates, companies, or job titles - only extract what's clearly written
 
CV: ${extractedText}`;
        const aiResponse = await this.claude.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4000,
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        });
        const rawResponse = (aiResponse.content || [])
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n');
        let cleaned = rawResponse.trim();
        cleaned = cleaned
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(cleaned);
    }
    private mergeRegexAndAi(regexData: any, aiData: any): any {
        if (!aiData)
            return regexData;
        const merged: any = {};
        const fields = [
            'firstName',
            'lastName',
            'email',
            'phone',
            'address',
            'country',
            'city',
            'linkedinUrl',
            'summary',
            'currentJobTitle',
            'currentCompany',
            'yearsOfExperience',
            'minSalary',
            'maxSalary',
            'currency',
        ];
        for (const field of fields) {
            const aiVal = aiData[field];
            const regexVal = regexData[field];
            if (aiVal !== undefined && aiVal !== null && aiVal !== '' && aiVal !== 0) {
                merged[field] = aiVal;
            }
            else {
                merged[field] = regexVal;
            }
        }
        merged.skills = aiData.skills?.length > 0 ? aiData.skills : regexData.skills;
        merged.languages = aiData.languages?.length > 0 ? aiData.languages : regexData.languages;
        merged.education = aiData.education?.length > 0 ? aiData.education : regexData.education;
        merged.certifications =
            aiData.certifications?.length > 0 ? aiData.certifications : regexData.certifications;
        merged.experiences =
            aiData.experiences?.length > 0 ? aiData.experiences : regexData.experiences || [];
        return merged;
    }
    private normalizeCvText(value: string): string {
        return value
            .replace(/\r\n?/g, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    private normalizeCvComparable(value: string): string {
        return value
            .toLowerCase()
            .replace(/[’']/g, '')
            .replace(/[^a-z0-9+#./]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    private normalizeCvSectionTitle(value: string): string {
        const normalized = value
            .toLowerCase()
            .replace(/[^a-z&/ ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const aliases: Record<string, string> = {
            'about me': 'Summary',
            'career objective': 'Summary',
            'personal statement': 'Summary',
            'professional profile': 'Summary',
            'professional summary': 'Summary',
            'profile': 'Summary',
            'profile highlights': 'Summary',
            'summary': 'Summary',
            'employment history': 'Experience',
            'professional experience': 'Experience',
            'work experience': 'Experience',
            'work experiences': 'Experience',
            'experience': 'Experience',
            'education': 'Education',
            'education and qualifications': 'Education',
            'qualifications': 'Education',
            'language proficiency': 'Language Proficiency',
            'languages': 'Language Proficiency',
            'key skills': 'Technical Skills',
            'skills': 'Technical Skills',
            'technical skills': 'Technical Skills',
            'training': 'Professional Training',
            'professional training': 'Professional Training',
            'awards': 'Awards & Achievements',
            'achievements': 'Awards & Achievements',
            'awards & achievements': 'Awards & Achievements',
            'interests': 'Miscellaneous',
            'miscellaneous': 'Miscellaneous',
            'additional information': 'Miscellaneous',
            'references': 'References',
            'reference': 'References',
            'referees': 'References',
            'professional references': 'References',
            'personal references': 'References',
        };
        if (aliases[normalized])
            return aliases[normalized];
        return value.trim().replace(/\s+/g, ' ');
    }
    private isReferenceSectionTitle(value: string): boolean {
        const normalized = value.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
        return this.normalizeCvSectionTitle(value) === 'References' || /\b(?:reference|references|referee|referees)\b/.test(normalized);
    }
    private isCandidateContactSectionTitle(value: string): boolean {
        const normalized = value
            .toLowerCase()
            .replace(/[^a-z ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return new Set([
            'contact',
            'contact details',
            'contact information',
            'personal details',
            'personal information',
            'candidate details',
        ]).has(normalized);
    }
    private isCvStructuralLine(line: string): boolean {
        const normalized = line
            .toLowerCase()
            .replace(/[^a-z&/ ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const headings = new Set([
            'about me',
            'achievements',
            'additional information',
            'awards',
            'awards & achievements',
            'career objective',
            'certifications',
            'contact',
            'contact details',
            'contact information',
            'core competencies',
            'education',
            'education and qualifications',
            'employment history',
            'experience',
            'interests',
            'key skills',
            'language proficiency',
            'languages',
            'miscellaneous',
            'personal details',
            'personal information',
            'personal statement',
            'professional experience',
            'professional profile',
            'professional summary',
            'professional training',
            'profile',
            'profile highlights',
            'projects',
            'qualifications',
            'reference',
            'references',
            'referees',
            'professional references',
            'personal references',
            'skills',
            'summary',
            'technical skills',
            'training',
            'work experience',
            'work experiences',
        ]);
        return headings.has(normalized);
    }
    private isContactInformationLine(line: string): boolean {
        const value = line.trim();
        if (!value)
            return false;
        if (/[\w.+-]+@[\w-]+\.[\w.-]+/i.test(value))
            return true;
        if (/(?:https?:\/\/|www\.|linkedin\.com|github\.com|facebook\.com|instagram\.com|x\.com\/|twitter\.com)/i.test(value))
            return true;
        if (/(?:phone|mobile|tel|telephone|whatsapp|e-mail|email|contact)\s*[:\-]/i.test(value))
            return true;
        const phoneMatches = value.match(/(?:\+\d{1,4}[\s().-]*)?(?:\d[\s().-]*){7,15}\d/g) ?? [];
        return phoneMatches.some((match) => {
            const digits = match.replace(/\D/g, '');
            return digits.length >= 8 && digits.length <= 16;
        });
    }
    private isLikelyCandidateLocationLine(line: string): boolean {
        const value = line.trim();
        if (!value || value.length > 80 || /\d{4}/.test(value))
            return false;
        const words = value.split(/\s+/).filter(Boolean);
        if (words.length > 8)
            return false;
        return /^[A-Za-zÀ-ÿ .'-]+,\s*[A-Za-zÀ-ÿ .'-]+$/.test(value) || /\b(?:UAE|UK|USA|KSA)\s*$/.test(value);
    }
    private isCandidatePersonalLine(line: string): boolean {
        const value = line.trim();
        if (!value)
            return false;
        const patterns = [
            /(?:passport|national\s*id|emirates\s*id|identity\s*(?:card|number))\s*[:\-]/i,
            /(?:marital\s*status|religion|father(?:'s)?\s*name|mother(?:'s)?\s*name|parent(?:s)?\s*name)\s*[:\-]/i,
            /(?:date\s*of\s*birth|dob|place\s*of\s*birth|gender|sex)\s*[:\-]/i,
            /\b(?:nationality|citizenship)\s*[:\-]/i,
            /\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|rue|po\s*box|p\.?o\.?\s*box)\b/i,
            /\b(?:national|citizen)\s*$/i,
        ];
        return patterns.some((pattern) => pattern.test(value));
    }
    private collectCandidateContactData(extractedText: string): {
        emails: Set<string>;
        phones: Set<string>;
        urls: Set<string>;
        personalLines: Set<string>;
    } {
        const lines = this.normalizeCvText(extractedText)
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const firstHeadingIndex = lines.findIndex((line) => this.isCvStructuralLine(line));
        const headerEnd = firstHeadingIndex >= 0 ? firstHeadingIndex : Math.min(lines.length, 30);
        const emails = new Set<string>();
        const phones = new Set<string>();
        const urls = new Set<string>();
        const personalLines = new Set<string>();
        let currentSection = '';
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            if (this.isCvStructuralLine(line)) {
                currentSection = this.normalizeCvSectionTitle(line);
                continue;
            }
            const isReference = this.isReferenceSectionTitle(currentSection);
            const isCandidateContactSection = this.isCandidateContactSectionTitle(currentSection) && !isReference;
            if (index >= headerEnd && !isCandidateContactSection) {
                continue;
            }
            for (const email of line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/gi) ?? []) {
                emails.add(email.toLowerCase());
            }
            for (const url of line.match(/(?:https?:\/\/|www\.)[^\s|•]+|(?:linkedin|github|facebook|instagram|twitter)\.com\/[^\s|•]+/gi) ?? []) {
                urls.add(url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[.,;:]+$/, ''));
            }
            for (const phone of line.match(/(?:\+\d{1,4}[\s().-]*)?(?:\d[\s().-]*){7,15}\d/g) ?? []) {
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 8 && digits.length <= 16) {
                    phones.add(digits);
                }
            }
            if (this.isCandidatePersonalLine(line) || this.isLikelyCandidateLocationLine(line)) {
                personalLines.add(this.normalizeCvComparable(line));
            }
        }
        return { emails, phones, urls, personalLines };
    }
    private stripCandidateContactFromLine(line: string): string {
        return line
            .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, ' ')
            .replace(/(?:https?:\/\/|www\.)[^\s|•]+|(?:linkedin|github|facebook|instagram|twitter)\.com\/[^\s|•]+/gi, ' ')
            .replace(/(?:\+\d{1,4}[\s().-]*)?(?:\d[\s().-]*){7,15}\d/g, ' ')
            .replace(/\b(?:mobile|phone|tel|telephone|whatsapp|e-mail|email|linkedin|github|website|web)\b\s*[:\-]?/gi, ' ')
            .replace(/[|•·]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '')
            .trim();
    }
    private isLikelyCandidateName(line: string): boolean {
        const value = line.trim();
        if (!value || value.length < 3 || value.length > 80)
            return false;
        if (/\d|@|https?:\/\/|www\./i.test(value))
            return false;
        if (/\b(?:resume|curriculum|vitae|profile|summary|contact|email|mobile|phone|address)\b/i.test(value))
            return false;
        if (this.isCvStructuralLine(value))
            return false;
        const words = value.split(/\s+/).filter(Boolean);
        if (words.length < 2 || words.length > 6)
            return false;
        return words.every((word) => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*$/.test(word));
    }
    private extractCandidateNameForCv(extractedText: string): string {
        const direct = this.extractFullName(extractedText);
        if (direct && this.isLikelyCandidateName(direct))
            return direct;
        const lines = this.normalizeCvText(extractedText)
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 20);
        for (const line of lines) {
            const cleaned = this.stripCandidateContactFromLine(line);
            if (this.isLikelyCandidateName(cleaned)) {
                return cleaned;
            }
        }
        return 'Candidate';
    }
    private containsCandidateContactValue(line: string, contactData: {
        emails: Set<string>;
        phones: Set<string>;
        urls: Set<string>;
        personalLines: Set<string>;
    }): boolean {
        const lower = line.toLowerCase();
        for (const email of contactData.emails) {
            if (lower.includes(email))
                return true;
        }
        const digits = line.replace(/\D/g, '');
        for (const phone of contactData.phones) {
            if (digits.includes(phone))
                return true;
        }
        const normalizedUrlLine = lower.replace(/^https?:\/\//, '').replace(/www\./g, '');
        for (const url of contactData.urls) {
            if (normalizedUrlLine.includes(url))
                return true;
        }
        const comparable = this.normalizeCvComparable(line);
        for (const personalLine of contactData.personalLines) {
            if (comparable === personalLine || (personalLine.length > 12 && comparable.includes(personalLine)))
                return true;
        }
        return false;
    }
    private prepareCvTextForFormatting(extractedText: string): string {
        const normalized = this.normalizeCvText(extractedText);
        const lines = normalized.split('\n');
        const contactData = this.collectCandidateContactData(normalized);
        const candidateName = this.extractCandidateNameForCv(normalized);
        const candidateNameComparable = this.normalizeCvComparable(candidateName);
        const firstHeadingIndex = lines.findIndex((line) => this.isCvStructuralLine(line.trim()));
        const headerEnd = firstHeadingIndex >= 0 ? firstHeadingIndex : Math.min(lines.length, 30);
        const output: string[] = [];
        let currentSection = '';
        let skipCandidateSection = false;
        let candidateNameAdded = false;
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index].trim();
            if (!line)
                continue;
            if (this.isCvStructuralLine(line)) {
                currentSection = this.normalizeCvSectionTitle(line);
                skipCandidateSection = this.isCandidateContactSectionTitle(line) && !this.isReferenceSectionTitle(line);
                if (!skipCandidateSection) {
                    output.push(line);
                }
                continue;
            }
            if (skipCandidateSection)
                continue;
            const isReference = this.isReferenceSectionTitle(currentSection);
            const comparable = this.normalizeCvComparable(line);
            const cleanedHeaderLine = this.stripCandidateContactFromLine(line);
            const isNameLine = candidateNameComparable && (comparable === candidateNameComparable || this.normalizeCvComparable(cleanedHeaderLine) === candidateNameComparable);
            if (index < headerEnd && !isReference) {
                if (isNameLine) {
                    if (!candidateNameAdded) {
                        output.push(candidateName);
                        candidateNameAdded = true;
                    }
                    continue;
                }
                if (this.isContactInformationLine(line) || this.isCandidatePersonalLine(line) || this.isLikelyCandidateLocationLine(line) || this.containsCandidateContactValue(line, contactData)) {
                    continue;
                }
            }
            if (this.containsCandidateContactValue(line, contactData))
                continue;
            if (!isReference && this.isCandidatePersonalLine(line))
                continue;
            output.push(line);
        }
        return this.normalizeCvText(output.join('\n'));
    }
    private sanitizeFormattedCvContent(formattedContent: string, sourceText: string, originalText: string): string {
        const contactData = this.collectCandidateContactData(originalText);
        const candidateName = this.extractCandidateNameForCv(originalText);
        const sourceHasAdditionalInformation = this.normalizeCvText(sourceText)
            .split('\n')
            .some((line) => line.trim().toLowerCase() === 'additional information');
        const output: string[] = [];
        let currentSection = '';
        let dropSection = false;
        let dropContinuation = false;
        for (const rawLine of formattedContent.replace(/\r/g, '').split('\n')) {
            const line = rawLine.trim();
            if (!line)
                continue;
            const match = line.match(/^\[(NAME|SECTION|COMPANY|JOBTITLE|BULLET|EDUCATION|INSTITUTION|CERTBODY|CERTIFICATION|CERTORG|NORMAL|SUBHEADING)\]\s*(.*)$/i);
            if (!match) {
                if (!dropSection && !dropContinuation) {
                    output.push(line);
                }
                continue;
            }
            const tag = match[1].toUpperCase();
            const content = match[2].trim();
            if (tag === 'NAME') {
                output.push(`[NAME]${candidateName}`);
                dropContinuation = false;
                continue;
            }
            if (tag === 'SECTION') {
                currentSection = this.normalizeCvSectionTitle(content);
                const isGenericAdditional = currentSection === 'Miscellaneous' && content.trim().toLowerCase() === 'additional information' && !sourceHasAdditionalInformation;
                dropSection = isGenericAdditional || (this.isCandidateContactSectionTitle(content) && !this.isReferenceSectionTitle(content));
                dropContinuation = dropSection;
                if (!dropSection) {
                    output.push(`[SECTION]${currentSection}`);
                }
                continue;
            }
            if (dropSection)
                continue;
            const isReference = this.isReferenceSectionTitle(currentSection);
            const removeLine = this.containsCandidateContactValue(content, contactData) ||
                (!isReference && this.isCandidatePersonalLine(content)) ||
                (this.isCandidateContactSectionTitle(currentSection) && this.isContactInformationLine(content));
            dropContinuation = removeLine;
            if (!removeLine && content) {
                output.push(`[${tag}]${content}`);
            }
        }
        return output.join('\n').trim();
    }
    private getCvValidationLines(extractedText: string): string[] {
        const lines = this.normalizeCvText(extractedText).split('\n');
        const result: string[] = [];
        let currentSection = '';
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line)
                continue;
            if (this.isCvStructuralLine(line)) {
                currentSection = this.normalizeCvSectionTitle(line);
                continue;
            }
            const isReference = this.isReferenceSectionTitle(currentSection);
            if (!isReference && (this.isCandidatePersonalLine(line) || this.isContactInformationLine(line)))
                continue;
            if (line.length > 1) {
                result.push(line);
            }
        }
        return result;
    }
    private stripCvFormattingTags(value: string): string {
        return value
            .replace(/```(?:text)?/gi, '')
            .replace(/\[(?:NAME|SECTION|COMPANY|JOBTITLE|BULLET|EDUCATION|INSTITUTION|CERTBODY|CERTIFICATION|CERTORG|NORMAL|SUBHEADING)\]/gi, ' ')
            .replace(/\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    private getCvLineCoverage(line: string, formattedContent: string): number {
        const sourceTokens = this.normalizeCvComparable(line)
            .split(' ')
            .filter((token) => token.length > 1);
        if (!sourceTokens.length)
            return 1;
        const formattedTokens = new Set(this.normalizeCvComparable(formattedContent)
            .split(' ')
            .filter((token) => token.length > 1));
        const matched = sourceTokens.filter((token) => formattedTokens.has(token)).length;
        return matched / sourceTokens.length;
    }
    private getMissingCvLines(extractedText: string, formattedContent: string): string[] {
        const formatted = this.stripCvFormattingTags(formattedContent);
        const normalizedFormatted = this.normalizeCvComparable(formatted);
        return this.getCvValidationLines(extractedText).filter((line) => {
            const normalizedLine = this.normalizeCvComparable(line);
            if (normalizedLine.length < 4)
                return false;
            if (normalizedFormatted.includes(normalizedLine))
                return false;
            return this.getCvLineCoverage(line, formatted) < 0.82;
        });
    }
    private getCvNumberCoverage(extractedText: string, formattedContent: string): number {
        const sourceText = this.getCvValidationLines(extractedText).join('\n');
        const sourceNumbers = Array.from(new Set(sourceText.match(/\b\d+(?:[.,]\d+)*(?:%|\+)?\b/g) ?? []));
        if (!sourceNumbers.length)
            return 1;
        const formatted = this.stripCvFormattingTags(formattedContent);
        const matched = sourceNumbers.filter((value) => formatted.includes(value)).length;
        return matched / sourceNumbers.length;
    }
    private getCvContentCoverage(extractedText: string, formattedContent: string): number {
        const sourceLines = this.getCvValidationLines(extractedText);
        if (!sourceLines.length)
            return 1;
        const formatted = this.stripCvFormattingTags(formattedContent);
        const totalWeight = sourceLines.reduce((sum, line) => sum + Math.max(line.length, 20), 0);
        const matchedWeight = sourceLines.reduce((sum, line) => {
            const coverage = this.getCvLineCoverage(line, formatted);
            return sum + Math.max(line.length, 20) * coverage;
        }, 0);
        return totalWeight ? matchedWeight / totalWeight : 1;
    }
    private getCvSourceEntries(extractedText: string): Array<{ line: string; section: string }> {
        const entries: Array<{ line: string; section: string }> = [];
        let currentSection = 'Summary';
        for (const rawLine of this.normalizeCvText(extractedText).split('\n')) {
            const line = rawLine.trim();
            if (!line)
                continue;
            if (this.isCvStructuralLine(line)) {
                currentSection = this.normalizeCvSectionTitle(line);
                continue;
            }
            entries.push({ line, section: currentSection });
        }
        return entries;
    }
    private restoreMissingCvContent(formattedContent: string, sourceText: string, missingLines: string[]): string {
        if (!missingLines.length)
            return formattedContent.trim();
        const sourceEntries = this.getCvSourceEntries(sourceText);
        const groups = new Map<string, string[]>();
        for (const missingLine of missingLines) {
            const comparable = this.normalizeCvComparable(missingLine);
            const entry = sourceEntries.find((item) => {
                const itemComparable = this.normalizeCvComparable(item.line);
                if (itemComparable === comparable || itemComparable.includes(comparable) || comparable.includes(itemComparable))
                    return true;
                return this.getCvLineCoverage(missingLine, item.line) >= 0.82;
            });
            const section = entry?.section || 'Miscellaneous';
            if (!groups.has(section)) {
                groups.set(section, []);
            }
            groups.get(section)?.push(missingLine);
        }
        const additions: string[] = [];
        for (const [section, lines] of groups.entries()) {
            additions.push(`[SECTION]${section}`);
            for (const line of lines) {
                const isBullet = /^[•●▪◦·\-]\s*/.test(line);
                const clean = line.replace(/^[•●▪◦·\-]\s*/, '').trim();
                additions.push(`${isBullet ? '[BULLET]' : '[NORMAL]'}${clean}`);
            }
        }
        return `${formattedContent.trim()}\n${additions.join('\n')}`.trim();
    }
    private parseFormattedCv(formattedContent: string): {
        name: string;
        sections: Array<{
            title: string;
            items: Array<{
                tag: string;
                content: string;
            }>;
        }>;
    } {
        const allowedTags = new Set([
            'NAME',
            'SECTION',
            'COMPANY',
            'JOBTITLE',
            'BULLET',
            'EDUCATION',
            'INSTITUTION',
            'CERTBODY',
            'CERTIFICATION',
            'CERTORG',
            'NORMAL',
            'SUBHEADING',
        ]);
        const sections: Array<{
            title: string;
            items: Array<{
                tag: string;
                content: string;
            }>;
        }> = [];
        let name = '';
        let currentSection: {
            title: string;
            items: Array<{
                tag: string;
                content: string;
            }>;
        } | undefined;
        let lastItem: {
            tag: string;
            content: string;
        } | undefined;
        const getOrCreateSection = (title: string) => {
            const normalizedTitle = this.normalizeCvSectionTitle(title || 'Summary');
            const existing = sections.find((section) => section.title.toLowerCase() === normalizedTitle.toLowerCase());
            if (existing) {
                currentSection = existing;
                return existing;
            }
            currentSection = { title: normalizedTitle, items: [] };
            sections.push(currentSection);
            return currentSection;
        };
        const ensureSection = () => currentSection || getOrCreateSection('Summary');
        const cleaned = formattedContent
            .replace(/^```(?:text)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .replace(/\r/g, '')
            .trim();
        for (const rawLine of cleaned.split('\n')) {
            const line = rawLine.trim();
            if (!line)
                continue;
            const match = line.match(/^\[(NAME|SECTION|COMPANY|JOBTITLE|BULLET|EDUCATION|INSTITUTION|CERTBODY|CERTIFICATION|CERTORG|NORMAL|SUBHEADING)\]\s*(.*)$/i);
            if (!match) {
                if (lastItem) {
                    lastItem.content = `${lastItem.content} ${line}`.trim();
                }
                continue;
            }
            const tag = match[1].toUpperCase();
            const content = match[2].trim();
            if (!allowedTags.has(tag) || !content)
                continue;
            if (tag === 'NAME') {
                name = content;
                lastItem = undefined;
                continue;
            }
            if (tag === 'SECTION') {
                getOrCreateSection(content);
                lastItem = undefined;
                continue;
            }
            const section = ensureSection();
            lastItem = { tag, content };
            section.items.push(lastItem);
        }
        const nonEmptySections = sections.filter((section) => section.title.trim() && section.items.some((item) => item.content.trim()));
        if (!name) {
            name = 'Candidate';
        }
        if (!nonEmptySections.length) {
            throw new Error('Formatted CV did not contain any usable tagged sections');
        }
        return { name, sections: nonEmptySections };
    }
    private buildCvFormattingPrompt(extractedText: string): string {
        return `IMPORTANT: The following CV text may be quite long. Please ensure you allocate sufficient memory to process the entire content thoroughly.

You are an AI assistant that extracts and formats information from resumes. Given the following CV text, please extract and format ALL relevant information into a well-structured, professional-looking resume. Only use the information provided in the CV text below. Do not add any information that is not present in the given CV. Do not add in you're generic prompt of 'Here's your formatted CV' and etc. Follow these strict guidelines:

1. CRITICAL - Content Preservation:
   - Keep 98% of content exactly as written
   - Only fix basic grammar and punctuation
   - Do not paraphrase or rewrite content
   - Keep all technical terms exactly as written
   - Preserve all metrics and numbers exactly
   - Maintain all project descriptions exactly
2. Grammar Fixing Rules:
   - Fix only obvious spelling mistakes
   - Add missing periods at end of sentences
   - Fix basic capitalization only where clearly wrong
   - Fix only obvious punctuation errors
   - Do not rephrase or rewrite sentences
3. Preserve the structure of the CV exactly as provided. Extract ALL sections in their original order.
4. Extract ALL information from the CV, including full sentences, paragraphs, and bullet points exactly as written.
5. Use the exact words and phrases from the original CV.
6. Do not add any information that is not present in the original CV.
7. Maintain all specific details, metrics, numbers, and achievements exactly as written.
8. Handle educational qualifications thoroughly:
   - Extract ALL degrees, certifications, and qualifications exactly as written
   - Include all certification bodies, institutions, and authorizing organizations
   - Preserve full names of certifying bodies (e.g., 'KHDA, Ministry of Education')
   - Keep complete qualification names (e.g., 'Certified Human Resource Management Professional (CHRMP)')
   - Maintain all location information (e.g., 'Dubai, UAE')
   - Keep certification years/dates exactly as shown
9. Use the following format (BE VERY THOROUGH) for structuring the extracted information:
[NAME]Full Name
[SECTION]Section Heading
[COMPANY]Company Name, Location
[JOBTITLE]Job Title | Date Range
[BULLET]Bullet point
[EDUCATION]Degree/Qualification Name | Date Range
[INSTITUTION]Institution Name, Location
[CERTBODY]Certifying Body/Authority Details
[CERTIFICATION]Certification Name | Date
[CERTORG]Organization Name, Location
[NORMAL]Normal text
[SUBHEADING]Subheading or Category Title

10. Ensure that dates are consistently formatted as 'Month Year - Month Year' or 'Month Year - Present' or just 'Year' as appropriate.
11. Include countries or cities where the person has worked or studied, ensuring they are properly formatted with correct capitalization (e.g., 'Dubai, United Arab Emirates'). Do not include any asterisks or special characters.
12. Remove the candidate's own contact-based information, including email addresses, phone numbers, social links, personal website links and residential address. Also remove parent names, passport number, marital status, religion, nationality or similar personal details. Preserve contact information only when it clearly belongs to a separately identified reference or referee.
13. CRITICAL: For the Summary section:
    - Look for and include ALL profile highlights, key skills, or professional summary information
    - Search for sections labeled as 'Profile', 'Summary', 'Professional Summary', 'Profile Highlights', 'Key Skills', etc.
    - Format the Summary section with clear structure:
      * Start with a brief overview paragraph if available
      * Use [SUBHEADING] for category titles (e.g., 'Core Competencies', 'Technical Skills')
      * Follow each subheading with relevant [BULLET] points
      * Maintain original grouping of skills and highlights
14. Organize the content in the following order (if available):
    - Summary/Profile information (Name it as 'Summary')
    - Work Experience (Name as 'Experience')
    - Education and Qualifications
    - Technical Skills
    - Language Proficiency
    - Professional Training
    - Awards & Achievements
15. For any section not listed above, create an appropriate professional section name with appropriate bulleting for each. Do not create a generic 'Additional Information' section unless that exact section exists in the source CV.
16. DO NOT use tabs to separate information. Use the '|' character to separate titles and dates.
17. Ensure education entries and certification entries have dates on the same line, separated by ' | '.
18. When processing educational qualifications and certifications, preserve ALL details including:
    - Full qualification names with any abbreviations
    - Complete certification body names
    - All locations and institutions
    - All dates and year information
19. ALWAYS place skills in the lower half of the CV.
20. For Professional Training section:
    - Format all training items as bullet points using [BULLET]
    - Include dates and certification details within the bullet points
    - Maintain chronological order if dates are provided
21. CRITICAL: Grammar and Formatting Rules:
    - Make only essential grammar fixes that don't change meaning
    - Fix only obvious spelling mistakes
    - Add missing punctuation only where clearly needed
    - Keep all technical terms exactly as written
    - Maintain all abbreviations as shown
Please provide the formatted CV content, ready to be inserted into a Word document. Remember to maintain the original content as much as possible except information not relevant in a CV.Do not create a summary if the person has not provided any.

CV text:
${extractedText}`;
    }
    private async formatCvContent(extractedText: string): Promise<string> {
        const sourceText = this.prepareCvTextForFormatting(extractedText);
        const basePrompt = this.buildCvFormattingPrompt(sourceText);
        let missingLines: string[] = [];
        let formattedContent = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
            const correction = missingLines.length
                ? `\n\nThe previous response omitted some CV content. Regenerate the complete tagged CV from the beginning. Do not summarise, merge, shorten, or paraphrase these missing source lines. Include each line in its original section using the appropriate allowed tag. Do not add an Additional Information section. Do not include the candidate's own email, phone number, social links, website, residential address, nationality or other personal details. Preserve contact details only for explicitly identified references or referees:\n${missingLines.map((line) => `- ${line}`).join('\n')}`
                : '';
            console.log(`[CV_FORMAT] Attempt ${attempt} started | sourceChars=${sourceText.length} | sourceLines=${this.getCvValidationLines(sourceText).length}`);
            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 12000,
                temperature: 0,
                messages: [{ role: 'user', content: [{ type: 'text', text: `${basePrompt}${correction}` }] }],
            });
            const rawContent = (response.content || [])
                .filter((block: any) => block.type === 'text')
                .map((block: any) => block.text)
                .join('\n')
                .trim();
            formattedContent = this.sanitizeFormattedCvContent(rawContent, sourceText, extractedText);
            const stopReason = (response as any).stop_reason ?? 'unknown';
            missingLines = this.getMissingCvLines(sourceText, formattedContent);
            const contentCoverage = this.getCvContentCoverage(sourceText, formattedContent);
            const numberCoverage = this.getCvNumberCoverage(sourceText, formattedContent);
            console.log(`[CV_VERIFY] Attempt ${attempt} completed | stopReason=${stopReason} | outputChars=${formattedContent.length} | contentCoverage=${(contentCoverage * 100).toFixed(2)}% | numberCoverage=${(numberCoverage * 100).toFixed(2)}% | missingLines=${missingLines.length}`);
            if (formattedContent && stopReason !== 'max_tokens' && contentCoverage >= 0.94 && numberCoverage === 1 && missingLines.length <= 2) {
                break;
            }
        }
        if (!formattedContent) {
            throw new Error('CV formatter returned empty content');
        }
        const remainingMissingLines = this.getMissingCvLines(sourceText, formattedContent);
        if (remainingMissingLines.length) {
            console.warn(`[CV_VERIFY] Restoring ${remainingMissingLines.length} omitted source lines into their original sections`);
            formattedContent = this.restoreMissingCvContent(formattedContent, sourceText, remainingMissingLines);
        }
        formattedContent = this.sanitizeFormattedCvContent(formattedContent, sourceText, extractedText);
        const finalCoverage = this.getCvContentCoverage(sourceText, formattedContent);
        const finalNumberCoverage = this.getCvNumberCoverage(sourceText, formattedContent);
        const finalMissingLines = this.getMissingCvLines(sourceText, formattedContent);
        console.log(`[CV_VERIFY] Final result | contentCoverage=${(finalCoverage * 100).toFixed(2)}% | numberCoverage=${(finalNumberCoverage * 100).toFixed(2)}% | missingLines=${finalMissingLines.length} | outputChars=${formattedContent.length}`);
        return formattedContent;
    }
    async processCvAsync(file: {
        originalname: string;
        buffer: Buffer;
    }, originalKey: string, folderName?: FolderNames, candidateProfileImage?: string | null) {
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();
        const originalUrl = this.getMediaUrl(originalKey);
        try {
            let extractedText = '';
            if (fileExt === 'pdf') {
                const data = await pdfParse(file.buffer);
                extractedText = data.text;
            }
            else if (fileExt === 'docx') {
                const result = await mammoth.extractRawText({ buffer: file.buffer });
                extractedText = result.value;
            }
            if (!extractedText.trim())
                throw new Error('No readable text found in CV');
            console.log(`[CV_PROCESS] Extracted CV text | file=${file.originalname} | chars=${extractedText.length} | lines=${extractedText.split(/\r?\n/).filter((line) => line.trim()).length}`);
            const processed = await this.formatCvContent(extractedText);
            const parsedCv = this.parseFormattedCv(processed);
            if (parsedCv.name === 'Candidate') {
                parsedCv.name = this.extractFullName(extractedText) || 'Candidate';
            }
            console.log(`[CV_PROCESS] Tagged CV parsed | name=${parsedCv.name} | sections=${parsedCv.sections.length} | items=${parsedCv.sections.reduce((sum, section) => sum + section.items.length, 0)}`);
            const logoBuf = await this.cleanPng(Buffer.from(LOGO_B64, 'base64'));
            const logoWmBuf = await this.cleanPng(Buffer.from(LOGO_WM_B64, 'base64'));
            const navyBarBuf = await this.cleanPng(Buffer.from(NAVY_BAR_B64, 'base64'));
            const roundCorners = async (input: Buffer | {
                buffer: Buffer;
                shouldInvert: boolean;
            }): Promise<Buffer> => {
                const sharpLib = require('sharp');
                const W = 131, H = 197, R = 16;
                const inputBuffer = Buffer.isBuffer(input) ? input : input.buffer;
                const shouldInvert = Buffer.isBuffer(input) ? false : input.shouldInvert;
                const metadata = await sharpLib(inputBuffer).metadata();
                if (metadata.space === 'cmyk') {
                    return inputBuffer;
                }
                const svgClip = `<svg width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" rx="${R}" ry="${R}" fill="white"/></svg>`;
                let result = await sharpLib(inputBuffer, { failOn: 'none' })
                    .resize(W, H, { fit: 'cover', position: 'centre' })
                    .composite([{ input: Buffer.from(svgClip), blend: 'dest-in' }])
                    .png()
                    .toBuffer();
                if (metadata.space === 'cmyk') {
                    result = await sharpLib(result).negate().toBuffer();
                }
                else if (shouldInvert) {
                    result = await sharpLib(result).negate().toBuffer();
                }
                return result;
            };
            let rawPhotoBuf: Buffer | {
                buffer: Buffer;
                shouldInvert: boolean;
            } | null = null;
            const extractedPhoto = await this.extractPhotoFromCv(file.buffer, fileExt ?? '');
            if (extractedPhoto) {
                const sharpLib = require('sharp');
                try {
                    const photoMeta = await sharpLib(extractedPhoto.buffer).metadata();
                    if (photoMeta.space === 'cmyk') {
                        try {
                            const { execSync } = require('child_process');
                            const { writeFileSync, readFileSync, unlinkSync, existsSync } = require('fs');
                            const tmpInput = `/tmp/cmyk_photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                            const tmpOutput = `/tmp/rgb_photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                            writeFileSync(tmpInput, extractedPhoto.buffer);
                            execSync(`convert "${tmpInput}" -negate -colorspace sRGB "${tmpOutput}"`, {
                                timeout: 10000,
                            });
                            if (existsSync(tmpOutput)) {
                                const rgbBuffer = readFileSync(tmpOutput);
                                try {
                                    unlinkSync(tmpInput);
                                }
                                catch { }
                                try {
                                    unlinkSync(tmpOutput);
                                }
                                catch { }
                                rawPhotoBuf = rgbBuffer;
                            }
                            else {
                                throw new Error('ImageMagick output not created');
                            }
                        }
                        catch (magickErr: any) {
                            rawPhotoBuf = null;
                        }
                    }
                    else {
                        rawPhotoBuf = extractedPhoto;
                    }
                }
                catch (metaErr: any) {
                    console.error(`[processCvAsync] Metadata check failed: ${metaErr.message}`);
                    rawPhotoBuf = extractedPhoto;
                }
            }
            else if (candidateProfileImage) {
                try {
                    const res = await fetch(this.getMediaUrl(candidateProfileImage)!);
                    if (res.ok) {
                        const fetched = Buffer.from(await res.arrayBuffer());
                        if (this.isValidImage(fetched))
                            rawPhotoBuf = fetched;
                    }
                }
                catch { }
            }
            let photoBuf: Buffer | null = null;
            if (rawPhotoBuf) {
                try {
                    photoBuf = await roundCorners(rawPhotoBuf);
                }
                catch (err) {
                    photoBuf = null;
                }
            }
            const NAVY = '012945', GRAY2 = '666666';
            const tx = (text: string, o: any = {}) => new TextRun({ text, font: 'Arial', size: 22, color: '333333', ...o });
            const sp = (a = 80, b = 0) => ({ before: b, after: a });
            const prg = (children: any, o: any = {}) => new Paragraph({
                children: Array.isArray(children) ? children : [children],
                spacing: sp(80),
                ...o,
            });
            const sHead = (t: string) => new Paragraph({
                children: [
                    new TextRun({ text: t, bold: true, font: 'Arial', size: 27, color: '000000' }),
                ],
                spacing: { before: 200, after: 100 },
                keepNext: true,
                keepLines: true,
            });
            const bul = (t: string) => new Paragraph({
                children: [tx(t)],
                numbering: { reference: 'bullets', level: 0 },
                spacing: sp(60),
            });
            const ls = (t: string) => t.split('\n').filter((l) => l.trim());
            const na = (s: string) => !s || ['n/a', '-', ''].includes(s.trim().toLowerCase());
            const children: any[] = [];
            children.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: logoWmBuf,
                        transformation: { width: 480, height: 157 },
                        type: 'png',
                        floating: {
                            horizontalPosition: { relative: 'page', offset: 1200000 },
                            verticalPosition: { relative: 'page', offset: 4600000 },
                            behindDocument: true,
                            allowOverlap: true,
                            wrap: { type: 0 as any },
                            lockAnchor: true,
                        },
                    }),
                ],
                spacing: sp(0),
            }));
            if (photoBuf) {
                children.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: photoBuf,
                            transformation: { width: 131, height: 197 },
                            type: 'png',
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 60, after: 80 },
                }));
            }
            children.push(new Paragraph({
                children: [tx(parsedCv.name, { bold: true, size: 32, color: '000000' })],
                alignment: AlignmentType.CENTER,
                spacing: sp(80, 0),
            }));
            for (const section of parsedCv.sections) {
                children.push(sHead(section.title));
                const sectionItems = section.items.filter((entry) => entry.content.trim());
                let companyBlockOpen = false;
                for (let itemIndex = 0; itemIndex < sectionItems.length; itemIndex++) {
                    const item = sectionItems[itemIndex];
                    const content = item.content.trim();
                    const nextItem = sectionItems[itemIndex + 1];
                    if (item.tag === 'BULLET') {
                        children.push(bul(content.replace(/^[•\-]\s*/, '')));
                        continue;
                    }
                    if (item.tag === 'COMPANY') {
                        companyBlockOpen = true;
                        children.push(new Paragraph({
                            children: [tx(content, { bold: true, color: NAVY, size: 21 })],
                            spacing: { before: 180, after: 40 },
                            keepNext: true,
                            keepLines: true,
                        }));
                        continue;
                    }
                    if (item.tag === 'JOBTITLE') {
                        const parts = content.split(/\s*\|\s*/);
                        const date = parts.length > 1 ? parts.pop()?.trim() ?? '' : '';
                        const title = parts.join(' | ').trim();
                        children.push(new Paragraph({
                            children: date
                                ? [
                                    tx(title, { color: GRAY2, size: 19 }),
                                    new TextRun({ text: '\t', font: 'Arial', size: 19 }),
                                    tx(date, { color: GRAY2, italics: true, size: 19 }),
                                ]
                                : [tx(title || content, { color: GRAY2, size: 19 })],
                            tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                            spacing: { before: 0, after: 60 },
                            keepNext: Boolean(nextItem),
                            keepLines: true,
                        }));
                        companyBlockOpen = false;
                        continue;
                    }
                    if (item.tag === 'EDUCATION' || item.tag === 'CERTIFICATION') {
                        const parts = content.split(/\s*\|\s*/);
                        const date = parts.length > 1 ? parts.pop()?.trim() ?? '' : '';
                        const title = parts.join(' | ').trim();
                        children.push(new Paragraph({
                            children: date
                                ? [
                                    tx(title, { bold: true, size: 21, color: NAVY }),
                                    new TextRun({ text: '\t', font: 'Arial', size: 19 }),
                                    tx(date, { color: GRAY2, italics: true, size: 19 }),
                                ]
                                : [tx(title || content, { bold: true, size: 21, color: NAVY })],
                            tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                            spacing: { before: 120, after: 40 },
                            keepNext: Boolean(nextItem),
                            keepLines: true,
                        }));
                        continue;
                    }
                    if (item.tag === 'INSTITUTION' ||
                        item.tag === 'CERTBODY' ||
                        item.tag === 'CERTORG') {
                        children.push(prg(tx(content, { color: GRAY2 }), {
                            keepNext: Boolean(nextItem && ['EDUCATION', 'CERTIFICATION', 'INSTITUTION', 'CERTBODY', 'CERTORG'].includes(nextItem.tag)),
                            keepLines: true,
                        }));
                        continue;
                    }
                    if (item.tag === 'SUBHEADING') {
                        children.push(new Paragraph({
                            children: [tx(content, { bold: true, color: NAVY, size: 21 })],
                            spacing: { before: 120, after: 60 },
                            keepNext: Boolean(nextItem),
                            keepLines: true,
                        }));
                        continue;
                    }
                    children.push(prg(tx(content), {
                        keepNext: companyBlockOpen,
                        keepLines: true,
                    }));
                }
            }
            const hlineNavyBuf = await this.cleanPng(Buffer.from(HLINE_NAVY_B64, 'base64'));
            const hdrCh: any[] = [];
            hdrCh.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: navyBarBuf,
                        transformation: { width: 18, height: 193 },
                        type: 'png',
                        floating: {
                            horizontalPosition: { relative: 'page', offset: 0 },
                            verticalPosition: { relative: 'page', offset: 0 },
                            behindDocument: false,
                            allowOverlap: true,
                            wrap: { type: 0 as any },
                        },
                    }),
                ],
                spacing: sp(0),
            }));
            hdrCh.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: logoWmBuf,
                        transformation: { width: 480, height: 157 },
                        type: 'png',
                        floating: {
                            horizontalPosition: { relative: 'page', offset: 1200000 },
                            verticalPosition: { relative: 'page', offset: 4600000 },
                            behindDocument: true,
                            allowOverlap: true,
                            wrap: { type: 0 as any },
                            lockAnchor: true,
                        },
                    }),
                ],
                spacing: sp(0),
            }));
            hdrCh.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: logoBuf,
                        transformation: { width: 130, height: 44 },
                        type: 'png',
                    }),
                    new ImageRun({
                        data: hlineNavyBuf,
                        transformation: { width: 560, height: 4 },
                        type: 'png',
                        floating: {
                            horizontalPosition: { relative: 'column', offset: 1350000 },
                            verticalPosition: { relative: 'paragraph', offset: 230000 },
                            behindDocument: false,
                            allowOverlap: true,
                            wrap: { type: 0 as any },
                        },
                    }),
                ],
                spacing: { before: 0, after: 100 },
            }));
            const iconEmailBuf = await this.cleanPng(Buffer.from(ICON_EMAIL_B64, 'base64'));
            const iconWebBuf = await this.cleanPng(Buffer.from(ICON_WEB_B64, 'base64'));
            const bottomBarBuf = await this.cleanPng(Buffer.from(BOTTOM_BAR_B64, 'base64'));
            const noCell = {
                top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            };
            const ftrCh = [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    layout: TableLayoutType.FIXED,
                    borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 33, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    borders: noCell,
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new ImageRun({
                                                    data: iconEmailBuf,
                                                    transformation: { width: 16, height: 16 },
                                                    type: 'png',
                                                }),
                                                new TextRun({
                                                    text: '  info@seamfox.com',
                                                    font: 'Arial',
                                                    size: 20,
                                                    color: '333333',
                                                }),
                                            ],
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 80, after: 80 },
                                        }),
                                    ],
                                }),
                                new TableCell({
                                    width: { size: 33, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    borders: noCell,
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new ImageRun({
                                                    data: iconWebBuf,
                                                    transformation: { width: 16, height: 16 },
                                                    type: 'png',
                                                }),
                                                new TextRun({
                                                    text: '  www.seamfox.com',
                                                    font: 'Arial',
                                                    size: 20,
                                                    color: '333333',
                                                }),
                                            ],
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 80, after: 80 },
                                        }),
                                    ],
                                }),
                                new TableCell({
                                    width: { size: 34, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    borders: noCell,
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: '⊙  Dubai, UAE',
                                                    font: 'Arial',
                                                    size: 20,
                                                    color: '333333',
                                                }),
                                            ],
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 80, after: 80 },
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: bottomBarBuf,
                            transformation: { width: 595, height: 22 },
                            type: 'png',
                            floating: {
                                horizontalPosition: { relative: 'page', offset: 0 },
                                verticalPosition: { relative: 'page', offset: 15530000 },
                                behindDocument: false,
                                allowOverlap: true,
                                wrap: { type: 0 as any },
                                lockAnchor: true,
                            },
                        }),
                    ],
                    spacing: { before: 0, after: 0 },
                }),
            ];
            const doc = new Document({
                numbering: {
                    config: [
                        {
                            reference: 'bullets',
                            levels: [
                                {
                                    level: 0,
                                    format: LevelFormat.BULLET,
                                    text: '•',
                                    alignment: AlignmentType.LEFT,
                                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                                },
                            ],
                        },
                    ],
                },
                sections: [
                    {
                        properties: {
                            page: {
                                size: { width: 11906, height: 16838 },
                                margin: { top: 150, right: 1134, bottom: 1134, left: 1400 },
                            },
                        },
                        headers: { default: { options: { children: hdrCh } } },
                        footers: { default: { options: { children: ftrCh } } },
                        children,
                    },
                ],
            });
            const processedBuffer = await Packer.toBuffer(doc);
            const baseName = file.originalname.replace(/\.[^.]+$/, '');
            const processedKey = await this.mediaService.uploadFile(`${baseName}_seamfox.docx`, processedBuffer, folderName ?? FolderNames.DEFAULT, processedBuffer.byteLength);
            return {
                originalKey,
                processedKey,
                processedUrl: this.getMediaUrl(processedKey),
                processedName: parsedCv.name || null,
            };
        }
        catch (err) {
            console.error('CV processing error:', err);
            return { originalKey, originalUrl, processedKey: null, processedUrl: null };
        }
    }
    async processCvAsPdf(file: {
        originalname: string;
        buffer: Buffer;
    }, originalKey: string, folderName?: FolderNames, candidateProfileImage?: string | null, candidateName?: string | null): Promise<{
        originalKey: string;
        processedKey: string | null;
        processedUrl: string | null;
    }> {
        try {
            const docxResult = await this.processCvAsync(file, originalKey, folderName, candidateProfileImage);
            if (!docxResult.processedKey) {
                console.error('[processCvAsPdf] DOCX generation returned no processedKey');
                return { originalKey, processedKey: null, processedUrl: null };
            }
            const docxBuffer = await this.mediaService.getFileBuffer(docxResult.processedKey);
            const libre = require('libreoffice-convert');
            const libreConvert: (input: Buffer, ext: string, filter: any) => Promise<Buffer> = typeof libre.convertAsync === 'function'
                ? libre.convertAsync.bind(libre)
                : require('util').promisify(libre.convert.bind(libre));
            const pdfBuffer: Buffer = await libreConvert(docxBuffer, '.pdf', undefined);
            const extractedName = (docxResult as any).processedName || '';
            const safeName = extractedName
                .trim()
                .replace(/[^a-zA-Z0-9\s_-]/g, '')
                .replace(/\s+/g, '_');
            const pdfFileName = safeName ? `${safeName}_SF.pdf` : 'CV_SF.pdf';
            const pdfKey = await this.mediaService.uploadFile(pdfFileName, pdfBuffer, folderName ?? FolderNames.DEFAULT, pdfBuffer.length);
            try {
                await this.deleteFile(docxResult.processedKey);
            }
            catch (cleanupErr: any) {
                console.warn('[processCvAsPdf] DOCX cleanup failed (non-fatal):', cleanupErr?.message);
            }
            return {
                originalKey,
                processedKey: pdfKey,
                processedUrl: this.getMediaUrl(pdfKey),
            };
        }
        catch (err: any) {
            console.error('[processCvAsPdf] FAILED');
            console.error('[processCvAsPdf] Error message:', err?.message);
            console.error('[processCvAsPdf] Error name:', err?.name);
            console.error('[processCvAsPdf] Stack:', err?.stack);
            return { originalKey, processedKey: null, processedUrl: null };
        }
    }
    private async extractPhotoFromCv(buffer: Buffer, ext: string): Promise<{
        buffer: Buffer;
        shouldInvert: boolean;
    } | null> {
        try {
            let candidates: Array<{
                buffer: Buffer;
                shouldInvert?: boolean;
            }> = [];
            if (ext === 'pdf') {
                const pdfLibImages = await this.extractImagesWithPdfLib(buffer);
                if (pdfLibImages.length > 0) {
                    candidates = pdfLibImages;
                }
                else {
                    const jpegs = this.extractJpegsFromBuffer(buffer).filter((b) => b.length > 5000);
                    const pngs = this.extractPngsFromBuffer(buffer).filter((b) => b.length > 5000);
                    candidates = [...jpegs.map((b) => ({ buffer: b })), ...pngs.map((b) => ({ buffer: b }))];
                }
            }
            else if (ext === 'docx') {
                const zip = await JSZip.loadAsync(buffer);
                for (const [filename, file] of Object.entries(zip.files) as any[]) {
                    if (!filename.startsWith('word/media/'))
                        continue;
                    const ext2 = filename.split('.').pop()?.toLowerCase();
                    if (!['jpg', 'jpeg', 'png'].includes(ext2))
                        continue;
                    const data: Buffer = await (file as any).async('nodebuffer');
                    if (data.length > 5000) {
                        candidates.push({ buffer: data });
                    }
                }
            }
            if (!candidates.length)
                return null;
            candidates.sort((a, b) => b.buffer.length - a.buffer.length);
            const picked = await this.pickPhotoWithClaude(candidates);
            return picked;
        }
        catch (err: any) {
            console.error(`[extractPhotoFromCv] ERROR: ${err.message}`);
        }
        return null;
    }
    private async pickPhotoWithClaude(candidates: Array<{
        buffer: Buffer;
        shouldInvert?: boolean;
    }>): Promise<{
        buffer: Buffer;
        shouldInvert: boolean;
    } | null> {
        if (!candidates.length)
            return null;
        const sharp = require('sharp');
        const content: any[] = [];
        const valid: Array<{
            buffer: Buffer;
            shouldInvert: boolean;
        }> = [];
        for (const item of candidates) {
            try {
                const small = await sharp(item.buffer, { failOn: 'none' })
                    .resize(200, 200, { fit: 'inside' })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                content.push({ type: 'text', text: `Image ${valid.length}:` });
                content.push({
                    type: 'image',
                    source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') },
                });
                valid.push({ buffer: item.buffer, shouldInvert: item.shouldInvert || false });
            }
            catch {
            }
        }
        if (!valid.length)
            return null;
        content.push({
            type: 'text',
            text: 'You are analyzing images extracted from a CV/resume. Each image above is labeled "Image N". ' +
                'Your task: Find the ONE image that shows a HUMAN FACE (headshot/portrait photo of a person). ' +
                '\n\nA HUMAN FACE means a photograph showing EYES, NOSE, and MOUTH of a real person. ' +
                'DO NOT select signatures, handwritten text, drawings, logos, icons, decorative graphics, or abstract art. ' +
                '\n\nCRITICAL: Even if an image is small or lower quality, if it shows a HUMAN FACE, select it. ' +
                'Look carefully at ALL images - the face photo might be smaller than decorative images. ' +
                '\n\nReply with ONLY the number (0, 1, 2, etc.) of the image showing a human face. ' +
                'If absolutely none show a human face, reply with -1. ' +
                'No explanation, just the number.',
        });
        try {
            const resp = await this.claude.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 10,
                messages: [{ role: 'user', content }],
            });
            const txt = (resp.content || [])
                .filter((b: any) => b.type === 'text')
                .map((b: any) => b.text)
                .join('')
                .trim();
            const m = txt.match(/-?\d+/);
            if (!m) {
                return null;
            }
            const pick = parseInt(m[0], 10);
            if (pick < 0 || pick >= valid.length) {
                return null;
            }
            return valid[pick];
        }
        catch (err) {
            return null;
        }
    }
    private async sanitizeDocxImages(buffer: Buffer): Promise<Buffer> {
        try {
            const JSZipLib = require('jszip');
            const zip = await JSZipLib.loadAsync(buffer);
            const sharp = require('sharp');
            const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/') && /\.(png|jpg|jpeg)$/i.test(name));
            for (const name of mediaFiles) {
                try {
                    const imgBuf: Buffer = await zip.files[name].async('nodebuffer');
                    const isPng = imgBuf[0] === 0x89 && imgBuf[1] === 0x50;
                    let cleaned: Buffer;
                    if (isPng) {
                        cleaned = await sharp(imgBuf, { failOn: 'none' })
                            .png({ compressionLevel: 9 })
                            .toBuffer();
                    }
                    else {
                        cleaned = await sharp(imgBuf, { failOn: 'none' })
                            .jpeg({ quality: 90 })
                            .toBuffer();
                    }
                    zip.file(name, cleaned);
                }
                catch (imgErr: any) {
                    console.warn(`[sanitizeDocxImages] skip ${name}:`, imgErr?.message);
                }
            }
            return await zip.generateAsync({ type: 'nodebuffer' });
        }
        catch (err: any) {
            console.warn('[sanitizeDocxImages] failed, using original buffer:', err?.message);
            return buffer;
        }
    }
    async convertToPdf(file: {
        originalname: string;
        buffer: Buffer;
    }, folderName: FolderNames = FolderNames.DEFAULT): Promise<{
        key: string | null;
        url: string | null;
    }> {
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();
        const baseName = file.originalname.replace(/\.[^.]+$/, '');
        try {
            if (fileExt === 'pdf') {
                const key = await this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.buffer.length);
                return { key, url: this.getMediaUrl(key) };
            }
            if (fileExt === 'docx') {
                const safeDocx = await this.sanitizeDocxImages(file.buffer);
                const libre = require('libreoffice-convert');
                const libreConvert: (input: Buffer, ext: string, filter: any) => Promise<Buffer> = typeof libre.convertAsync === 'function'
                    ? libre.convertAsync.bind(libre)
                    : require('util').promisify(libre.convert.bind(libre));
                const pdfBuffer: Buffer = await libreConvert(safeDocx, '.pdf', undefined);
                const key = await this.mediaService.uploadFile(`${baseName}.pdf`, pdfBuffer, folderName, pdfBuffer.length);
                return { key, url: this.getMediaUrl(key) };
            }
            const fallbackKey = await this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.buffer.length);
            return { key: fallbackKey, url: this.getMediaUrl(fallbackKey) };
        }
        catch (err: any) {
            console.error('[convertToPdf] failed, saving original as-is:', err?.message);
            try {
                const key = await this.mediaService.uploadFile(file.originalname, file.buffer, folderName, file.buffer.length);
                return { key, url: this.getMediaUrl(key) };
            }
            catch {
                return { key: null, url: null };
            }
        }
    }
    private isValidImage(buf: Buffer): boolean {
        if (!buf || buf.length < 4)
            return false;
        const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
        const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        return isJpeg || isPng;
    }
    private extractJpegsFromBuffer(buffer: Buffer): Buffer[] {
        const results: Buffer[] = [];
        let i = 0;
        let jpegCount = 0;
        while (i < buffer.length - 1) {
            if (buffer[i] === 0xff && buffer[i + 1] === 0xd8 && buffer[i + 2] === 0xff) {
                jpegCount++;
                let j = i + 2;
                let found = false;
                while (j < buffer.length - 1) {
                    if (buffer[j] === 0xff && buffer[j + 1] === 0xd9) {
                        const jpeg = buffer.slice(i, j + 2);
                        if (jpeg.length > 8000) {
                            results.push(jpeg);
                        }
                        else {
                        }
                        i = j + 2;
                        found = true;
                        break;
                    }
                    j++;
                }
                if (!found) {
                    break;
                }
            }
            else {
                i++;
            }
        }
        return results;
    }
    private extractPngsFromBuffer(buffer: Buffer): Buffer[] {
        const results: Buffer[] = [];
        let i = 0;
        let pngCount = 0;
        while (i < buffer.length - 8) {
            if (buffer[i] === 0x89 &&
                buffer[i + 1] === 0x50 &&
                buffer[i + 2] === 0x4e &&
                buffer[i + 3] === 0x47 &&
                buffer[i + 4] === 0x0d &&
                buffer[i + 5] === 0x0a &&
                buffer[i + 6] === 0x1a &&
                buffer[i + 7] === 0x0a) {
                pngCount++;
                let j = i + 8;
                let found = false;
                while (j < buffer.length - 12) {
                    if (buffer[j] === 0x49 &&
                        buffer[j + 1] === 0x45 &&
                        buffer[j + 2] === 0x4e &&
                        buffer[j + 3] === 0x44) {
                        const png = buffer.slice(i, j + 8);
                        if (png.length > 5000) {
                            results.push(png);
                        }
                        else {
                        }
                        i = j + 8;
                        found = true;
                        break;
                    }
                    j++;
                }
                if (!found) {
                    break;
                }
            }
            else {
                i++;
            }
        }
        return results;
    }
    private async extractImagesWithPdfLib(buffer: Buffer): Promise<Array<{
        buffer: Buffer;
        shouldInvert: boolean;
    }>> {
        const results: Array<{
            buffer: Buffer;
            shouldInvert: boolean;
        }> = [];
        try {
            const { PDFDocument, PDFName } = require('pdf-lib');
            const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const sharp = require('sharp');
            const zlib = require('zlib');
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                try {
                    const { Resources } = page.node.normalizedEntries();
                    if (!Resources) {
                        continue;
                    }
                    const xObjectDict = Resources.lookup(PDFName.of('XObject'));
                    if (!xObjectDict) {
                        continue;
                    }
                    const xObjectEntries = xObjectDict.dict.entries();
                    for (const [key, value] of xObjectEntries) {
                        const xObject = xObjectDict.lookup(key);
                        if (!xObject)
                            continue;
                        const subtype = xObject.dict.lookup(PDFName.of('Subtype'));
                        if (subtype?.toString() !== '/Image')
                            continue;
                        try {
                            const imageBytes = xObject.contents;
                            const imageBuffer = Buffer.from(imageBytes);
                            const decode = xObject.dict.lookup(PDFName.of('Decode'));
                            let shouldInvertColors = false;
                            if (decode) {
                                const decodeStr = decode.toString();
                                if (decodeStr.includes('[1 0') || decodeStr.includes('[ 1 0')) {
                                    shouldInvertColors = true;
                                }
                            }
                            const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
                            const isJpeg = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
                            const isCompressed = imageBuffer[0] === 0x78 &&
                                (imageBuffer[1] === 0x9c || imageBuffer[1] === 0xda || imageBuffer[1] === 0x01);
                            if (isPng || isJpeg) {
                                const format = isPng ? 'PNG' : 'JPEG';
                                if (imageBuffer.length > 5000) {
                                    results.push({ buffer: imageBuffer, shouldInvert: shouldInvertColors });
                                }
                                else {
                                }
                            }
                            else if (isCompressed) {
                                try {
                                    const colorSpace = xObject.dict.lookup(PDFName.of('ColorSpace'));
                                    const width = xObject.dict.lookup(PDFName.of('Width'));
                                    const height = xObject.dict.lookup(PDFName.of('Height'));
                                    const bitsPerComponent = xObject.dict.lookup(PDFName.of('BitsPerComponent'));
                                    const w = width ? parseInt(width.toString().replace(/[^0-9]/g, '')) : 0;
                                    const h = height ? parseInt(height.toString().replace(/[^0-9]/g, '')) : 0;
                                    const bpc = bitsPerComponent
                                        ? parseInt(bitsPerComponent.toString().replace(/[^0-9]/g, ''))
                                        : 8;
                                    const cs = colorSpace?.toString() || '';
                                    if (w > 0 && h > 0) {
                                        let decompressed = zlib.inflateSync(imageBuffer);
                                        let channels = 3;
                                        if (cs.includes('DeviceGray'))
                                            channels = 1;
                                        else if (cs.includes('DeviceRGB'))
                                            channels = 3;
                                        else if (cs.includes('DeviceCMYK'))
                                            channels = 4;
                                        if (shouldInvertColors) {
                                            for (let i = 0; i < decompressed.length; i++) {
                                                decompressed[i] = 255 - decompressed[i];
                                            }
                                        }
                                        const pngBuffer = await sharp(decompressed, {
                                            raw: {
                                                width: w,
                                                height: h,
                                                channels: channels,
                                            },
                                        })
                                            .png()
                                            .toBuffer();
                                        if (pngBuffer.length > 5000) {
                                            results.push({ buffer: pngBuffer, shouldInvert: false });
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                    }
                                }
                                catch (decompressErr: any) {
                                }
                            }
                            else {
                            }
                        }
                        catch (err: any) {
                            console.error(`[extractImagesWithPdfLib] Error extracting image: ${err.message}`);
                        }
                    }
                }
                catch (pageErr: any) {
                    console.error(`[extractImagesWithPdfLib] Page ${pageIndex + 1} error: ${pageErr.message}`);
                }
            }
        }
        catch (err: any) {
            console.error(`[extractImagesWithPdfLib] Failed: ${err.message}`);
            console.error(`[extractImagesWithPdfLib] Stack:`, err.stack);
        }
        return results;
    }
    async moveFile(newFolderName: string, sourceKey: string) {
        return this.mediaService.moveFile(newFolderName, sourceKey);
    }
    async deleteFile(key: string) {
        return this.mediaService.deleteFile(key);
    }
    getMediaUrl(fileKey?: string | null): string | null {
        if (!fileKey)
            return null;
        return `${this.getS3URL().replace(/\/$/, '')}/${fileKey.replace(/^\//, '')}`;
    }
    getS3URL() {
        return `https://${this.configService.get('AWS_BUCKET')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/`;
    }
    async signUpload(mime: string, ext?: string, folderName?: FolderNames) {
        return this.mediaService.signUpload(mime, ext, folderName);
    }
}
