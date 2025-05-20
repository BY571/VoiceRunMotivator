// paceFeedbackPhrases.ts

export type PaceFeedbackType = 'onPace' | 'behind' | 'ahead';

export type PaceMakerMode = 'Neutral' | 'Motivating' | 'Goggins';

export const paceFeedbackPhrases: Record<PaceMakerMode, Record<PaceFeedbackType, string[]>> = {
  Neutral: {
    onPace: [
      "You're on track.",
      "Current pace is good.",
      "Pacing as expected.",
      "Keeping the planned pace.",
      "No change needed.",
      "All is steady.",
      "You're matching the goal.",
      "Tracking well.",
      "Good pace.",
      "You're running on time."
    ],
    behind: [
      "You're slightly behind schedule.",
      "Pick up the pace.",
      "You're running slower than expected.",
      "Falling behind goal pace.",
      "You're lagging a bit.",
      "You need to move faster.",
      "Below target pace.",
      "Off target pace.",
      "Behind expected speed.",
      "Increase your speed."
    ],
    ahead: [
      "You're slightly ahead of schedule.",
      "You're running faster than needed.",
      "Try to ease off a little.",
      "You're ahead of goal pace.",
      "Slow down slightly.",
      "You're faster than expected.",
      "You're pushing the pace.",
      "Good, but maybe slow a bit.",
      "Running hot.",
      "Ahead of schedule."
    ]
  },
  Motivating: {
    onPace: [
      "Perfect pace! Keep going!",
      "You're right where you should be!",
      "Excellent pacing!",
      "Nice job holding pace!",
      "Keep that rhythm strong!",
      "You're dialed in!",
      "Right on time—keep it up!",
      "Smooth sailing!",
      "You're cruising!",
      "Solid effort!"
    ],
    behind: [
      "You’ve got more in the tank—pick it up!",
      "Let’s go, you can do this!",
      "Time to push a little harder!",
      "Don't let the pace drop!",
      "You're stronger than this!",
      "Catch that rhythm!",
      "Find your drive!",
      "Push through this!",
      "Dig deep!",
      "Pick it up, you've got it!"
    ],
    ahead: [
      "You're flying! Stay controlled!",
      "Awesome job—stay steady!",
      "Fast and focused!",
      "Stay smooth with that speed!",
      "Pushing the pace like a pro!",
      "Careful not to burn out!",
      "Strong pace, stay smart!",
      "You're crushing it—maintain!",
      "Hold that energy!",
      "Stay fast, stay calm!"
    ]
  },
  Goggins: {
    onPace: [
      "You’re on pace—but don’t get comfortable!",
      "Right where you should be—now stay hard!",
      "You're locked in—don't ease up!",
      "You think this is enough? Keep grinding!",
      "Stay in the fight!",
      "Hold the line!",
      "Discipline. Every step.",
      "This is just the beginning!",
      "Maintain the machine!",
      "You're pacing like a savage—keep going!"
    ],
    behind: [
      "You’re behind—time to suffer!",
      "No excuses. Run harder!",
      "Pain is weakness leaving the body—go!",
      "They don't know me son!",
      "Get after it!",
      "Suffer now or regret forever!",
      "You wanted this—so earn it!",
      "You don’t stop when you’re tired—you stop when you’re done!",
      "This is where most quit. Don’t be most.",
      "Move! You're wasting time!"
    ],
    ahead: [
      "You’re a beast—don’t slow down!",
      "You’re ahead because you’re built different!",
      "Stay aggressive!",
      "No brakes—only gas!",
      "Show no mercy to the old you!",
      "Keep hammering!",
      "Stay savage, stay strong!",
      "Lead the way!",
      "Outwork yesterday!",
      "Push beyond limits!"
    ]
  }
};
