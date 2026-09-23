import {
  Body, Controller, Delete, Get, Param, Patch,
  Post, Query, ParseIntPipe,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { GetAllBlogDto } from './dto/get-all-blogs.dto';
import { UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../lib/guards/auth.guard';
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }

  @Get(':slug/related')
  async getRelatedArticles(@Param('slug') slug: string) {
    const data = await this.blogService.getRelatedArticles(slug);
    return { status: true, code: 'SUCCESS', data };
  }
  @Get('insights')
  async getInsights(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.blogService.getInsights(
      +page,
      +limit,
      categoryId ? +categoryId : undefined,
      search,
    );
    return { status: true, code: 'SUCCESS', data };
  }

  @Get('categories')
  async getCategories() {
    const data = await this.blogService.findAllCategories();
    return { status: true, code: 'SUCCESS', data };
  }

  @Get(':slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    const data = await this.blogService.findBlogBySlug(slug);
    return { status: true, code: 'SUCCESS', data };
  }


  @Post()
  async createBlog(@Body() dto: CreateBlogDto) {
    const data = await this.blogService.createBlog(dto);
    return { status: true, code: 'SUCCESS', data };
  }

  @Get()
  async getAllBlogs(@Query() query: GetAllBlogDto) {
    const data = await this.blogService.findAllBlogs(query);
    return { status: true, code: 'SUCCESS', data };
  }


  @Get('id/:id')
  async getBlogById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.blogService.findBlogById(id);
    return { status: true, code: 'SUCCESS', data };
  }

  @Post(':slug/read')
  @UseGuards(AuthGuard)
  async markAsRead(@Param('slug') slug: string, @Req() req: Request) {
    const data = await this.blogService.markBlogAsRead(slug, req.user.id);
    return { data, message: 'Read recorded' };
  }

  @Get(':id/readers')
  async getReaders(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
  ) {
    const data = await this.blogService.getBlogReaders(
      Number(id),
      Number(page),
      Number(limit),
      search,
    );
    return { data, message: 'Readers fetched successfully' };
  }
 

  @Patch(':id')
  async updateBlog(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBlogDto) {
    const data = await this.blogService.updateBlog(id, dto);
    return { status: true, code: 'SUCCESS', data };
  }

  @Patch(':id/editor-pick')
  async toggleEditorPick(@Param('id', ParseIntPipe) id: number) {
    const data = await this.blogService.toggleEditorPick(id);
    return { status: true, code: 'SUCCESS', data };
  }

  @Patch(':id/featured')
  async toggleFeatured(@Param('id', ParseIntPipe) id: number) {
    const data = await this.blogService.toggleFeatured(id);
    return { status: true, code: 'SUCCESS', data };
  }

  @Delete(':id')
  async deleteBlog(@Param('id', ParseIntPipe) id: number) {
    await this.blogService.deleteBlog(id);
    return { status: true, code: 'SUCCESS', message: 'Blog deleted' };
  }

  @Post('category')
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    const data = await this.blogService.createCategory(dto);
    return { status: true, code: 'SUCCESS', data };
  }


  @Patch('category/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    const data = await this.blogService.updateCategory(id, dto);
    return { status: true, code: 'SUCCESS', data };
  }

  @Delete('category/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.blogService.deleteCategory(id);
    return { status: true, code: 'SUCCESS', message: 'Category deleted' };
  }
}