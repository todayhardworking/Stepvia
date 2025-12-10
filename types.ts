export enum GoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export enum Frequency {
  ONCE = 'Once',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly'
}

export enum AIPersona {
  MOTIVATIONAL = 'Motivational',
  DRILL_SERGEANT = 'Drill Sergeant',
  ANALYTICAL = 'Analytical'
}

export interface UserPreferences {
  displayName: string;
  darkMode: boolean;
  aiPersona: AIPersona;
  totalXp: number;
}

export interface SubStep {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string; // e.g., "30 mins"
  difficulty: Difficulty;
  frequency: Frequency;
  isCompleted: boolean; // For ONCE tasks
  checkIns: string[]; // ISO Date strings (YYYY-MM-DD) for recurring tasks
  deadline?: string; // YYYY-MM-DD
  subSteps?: SubStep[];
}

export interface Goal {
  id: string;
  title: string;
  motivation: string;
  createdAt: string; // ISO Date string
  deadline?: string; // YYYY-MM-DD
  status: GoalStatus;
  progress: number; // 0 to 100
  steps: ActionStep[];
  archived?: boolean;
}

export interface StepUpdate {
  stepId: string;
  changes: Partial<Omit<ActionStep, 'id' | 'subSteps'>>;
}

export interface ReviewResponse {
  analysis: string;
  modifications: StepUpdate[];
  newSteps: ActionStep[];
}