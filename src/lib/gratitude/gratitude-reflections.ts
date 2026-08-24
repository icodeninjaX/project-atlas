const GRATITUDE_TEMPLATES = [
  (subject: string) => `I’m grateful for ${subject}.`,
  (subject: string) => `Today I appreciate ${subject}.`,
  (subject: string) => `One gift I don’t want to overlook is ${subject}.`,
  (subject: string) =>
    `There is quiet goodness in ${subject}, and I’m grateful for it.`,
  (subject: string) =>
    `Today, I’m choosing to notice and be grateful for ${subject}.`,
] as const;

const GRATITUDE_SUBJECTS = [
  "a body that carries me, a mind that keeps learning, and another day to care",
  "the people who make ordinary moments feel like home",
  "the quiet chances today gives me to begin again",
  "a safe place where I can rest and be myself",
  "clean water and the comfort of having my basic needs met",
  "simple meals that nourish me and bring me back to the present",
  "the steady breath that keeps returning without asking for attention",
  "morning light finding its way into familiar rooms",
  "sleep that restores more of me than I can see",
  "hands that let me create, comfort, repair, and reach for others",
  "feet that have carried me through every difficult season so far",
  "the senses that let me experience color, music, warmth, and taste",
  "another chance to learn something I did not understand yesterday",
  "mistakes that have become teachers instead of permanent definitions",
  "the courage to take one honest step even when I cannot see the whole path",
  "patience that is slowly growing in places where I used to rush",
  "progress that is real even when it is too small to impress anyone else",
  "curiosity that keeps the world from becoming ordinary",
  "skills I once struggled with that now feel natural in my hands",
  "work that gives my effort somewhere useful to go",
  "the ability to earn, contribute, and build more stability over time",
  "tools that help me turn an idea into something real",
  "rest that does not need to be earned before it is allowed",
  "laughter that loosens the weight of a serious day",
  "a conversation where I felt heard instead of hurried",
  "a message from a friend arriving at exactly the right moment",
  "family stories that remind me I belong to something larger than today",
  "kindness from people who had no obligation to offer it",
  "mentors who shared what took them years to learn",
  "the people who believed in me while my own confidence was still catching up",
  "boundaries that protect my energy and make honest care possible",
  "forgiveness that lets the future be different from the past",
  "second chances, including the ones I can quietly give myself",
  "the small rhythms of home that make life feel held together",
  "familiar objects that carry useful memories and daily comfort",
  "clean clothes and the dignity of feeling ready for the day",
  "a warm shower that can reset both my body and my mood",
  "the first sip of a drink I genuinely enjoy",
  "music that can name a feeling before I find the words",
  "books and stories that let me borrow another person’s perspective",
  "technology that helps me stay close to people across distance",
  "reliable ways to get where I need to go",
  "a neighborhood with details I can keep discovering",
  "trees that keep growing without needing an audience",
  "rain that cools the air and gives the world a softer sound",
  "wind that reminds me the day is moving even when I feel stuck",
  "the open sky and the perspective it gives my worries",
  "the moon returning in a different shape and still remaining whole",
  "birds beginning their day with no concern for perfection",
  "seasons that prove change can be natural, gradual, and beautiful",
  "a quiet room where my thoughts can finally settle",
  "moments that do not need to be productive to be meaningful",
  "the relief of completing one task that had been taking up space in my mind",
  "a problem that taught me I am more resourceful than I assumed",
  "an idea that arrived because I gave myself room to wonder",
  "an opportunity to make someone else’s day a little lighter",
  "the ability to ask for help instead of carrying everything alone",
  "help I have received in forms I may not have fully noticed at the time",
  "the freedom to change my mind when new understanding arrives",
  "values that help me choose a direction when the path is unclear",
  "memories that still bring warmth long after the moment has passed",
  "something good on the horizon that I can look forward to",
  "resilience built quietly through days I did not think I could handle",
  "emotions that tell me what matters, even when they are uncomfortable",
  "small choices that let me become the person I want to be",
  "the unfinished space in today where something kind can still happen",
  "ordinary routines that give shape and steadiness to my life",
  "having enough for this moment, even while I continue building toward more",
  "the possibility that tomorrow can surprise me in a good way",
  "a sense of humor that helps me hold life with a gentler grip",
  "food shared with people whose company makes it taste better",
  "silence that gives me space to hear what I actually need",
  "the simple, astonishing fact that I am here and alive today",
] as const;

export const GRATITUDE_COLLECTION_SIZE =
  GRATITUDE_TEMPLATES.length * GRATITUDE_SUBJECTS.length;

export type GratitudeReflection = {
  collectionSize: number;
  index: number;
  message: string;
};

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function getGratitudeReflection(index: number): GratitudeReflection {
  if (!Number.isInteger(index)) {
    throw new Error(`Gratitude index must be an integer: ${index}`);
  }

  const normalizedIndex = positiveModulo(index, GRATITUDE_COLLECTION_SIZE);
  const template =
    GRATITUDE_TEMPLATES[normalizedIndex % GRATITUDE_TEMPLATES.length]!;
  const subject =
    GRATITUDE_SUBJECTS[
      Math.floor(normalizedIndex / GRATITUDE_TEMPLATES.length)
    ]!;

  return {
    collectionSize: GRATITUDE_COLLECTION_SIZE,
    index: normalizedIndex,
    message: template(subject),
  };
}

export function getRandomGratitude(
  excludeIndex?: number,
  randomValue = Math.random(),
): GratitudeReflection {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(
      `Random value must be between 0 (inclusive) and 1: ${randomValue}`,
    );
  }

  const normalizedExcludedIndex =
    excludeIndex === undefined
      ? undefined
      : positiveModulo(excludeIndex, GRATITUDE_COLLECTION_SIZE);
  const candidateCount =
    GRATITUDE_COLLECTION_SIZE - (normalizedExcludedIndex === undefined ? 0 : 1);
  let selectedIndex = Math.floor(randomValue * candidateCount);

  if (
    normalizedExcludedIndex !== undefined &&
    selectedIndex >= normalizedExcludedIndex
  ) {
    selectedIndex += 1;
  }

  return getGratitudeReflection(selectedIndex);
}
