import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_question_options')
@Index('unique_correct_option_per_question', ['questionId'], {
  unique: true,
  where: `"isCorrect" = true`,
})
export class QuizQuestionOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  questionId: number;

  @ManyToOne(() => QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Column('text')
  option: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;
}
