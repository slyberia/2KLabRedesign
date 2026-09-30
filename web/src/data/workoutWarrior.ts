import workoutJson from "@data/workout-warrior.json";

export interface WorkoutWarrior {
  answer: string;
  steps: { title: string; body: string }[];
  workouts: string[];
  facts: { term: string; detail: string }[];
}
export const workoutWarrior = workoutJson as WorkoutWarrior;
