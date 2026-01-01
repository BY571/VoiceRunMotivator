export type PaceFeedbackType = 'onPace' | 'behind' | 'ahead';

export const paceFeedbackPhrases: Record<PaceFeedbackType, string[]> = {
  onPace: [
    "You're on track.",
    "Good pace.",
    "Pacing as expected.",
    "Keeping the planned pace.",
    "You're matching the goal.",
    "On target.",
    "Pace is good.",
    "You're running on time.",
  ],
  behind: [
    "You're slightly behind.",
    "Pick up the pace.",
    "Running slower than target.",
    "Behind goal pace.",
    "Speed up a little.",
    "Below target pace.",
    "Try to go faster.",
  ],
  ahead: [
    "You're ahead of schedule.",
    "Running faster than needed.",
    "Ahead of goal pace.",
    "Ease off a little.",
    "Faster than expected.",
    "Ahead of schedule.",
    "You could slow down.",
  ],
};

export function getRandomFeedback(type: PaceFeedbackType): string {
  const messages = paceFeedbackPhrases[type];
  return messages[Math.floor(Math.random() * messages.length)];
}
