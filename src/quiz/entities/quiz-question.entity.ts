import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quizId: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column('text')
  question: string;

  @Column({ type: 'int' })
  points: number;

  @OneToMany(() => QuizQuestionOption, (opt) => opt.question)
  options: QuizQuestionOption[];
}
