import { ExerciseTest } from '../types/database';

export const EXERCISE_TESTS: Record<string, ExerciseTest[]> = {
  'ex-py-101': [
    {
      id: 'test-py-101-1',
      exercise_id: 'ex-py-101',
      input: null,
      expected_output: 'Hello RythmeBinaireGn',
      is_hidden: false,
    },
    {
      id: 'test-py-101-2',
      exercise_id: 'ex-py-101',
      input: null,
      expected_output: 'Hello RythmeBinaireGn',
      is_hidden: true,
    },
  ],
  'ex-py-102': [
    {
      id: 'test-py-102-1',
      exercise_id: 'ex-py-102',
      input: null,
      expected_output: 'Bienvenue à Conakry, en Guinée !',
      is_hidden: false,
    },
  ],
  'ex-py-103': [
    {
      id: 'test-py-103-1',
      exercise_id: 'ex-py-103',
      input: null,
      expected_output: 'Prix total : 150000 GNF',
      is_hidden: false,
    },
  ],
  'ex-js-101': [
    {
      id: 'test-js-101-1',
      exercise_id: 'ex-js-101',
      input: null,
      expected_output: 'Bienvenue dans la tech guinéenne !',
      is_hidden: false,
    },
  ],
};

export function getTestsForExercise(exerciseId: string): ExerciseTest[] {
  return (
    EXERCISE_TESTS[exerciseId] || [
      {
        id: `test-default-${exerciseId}`,
        exercise_id: exerciseId,
        input: null,
        expected_output: 'Output attendu',
        is_hidden: false,
      },
    ]
  );
}
