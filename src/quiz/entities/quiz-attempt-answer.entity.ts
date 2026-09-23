import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';

@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  attemptId: number;

  @ManyToOne(() => QuizAttempt, (a) => a.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: QuizAttempt;

  @Column({ type: 'int' })
  questionId: number;

  @ManyToOne(() => QuizQuestion, { eager: true })
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @Column({ type: 'int' })
  selectedOptionId: number;

  @ManyToOne(() => QuizQuestionOption, { eager: true })
  @JoinColumn({ name: 'selectedOptionId' })
  selectedOption: QuizQuestionOption;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;
}
