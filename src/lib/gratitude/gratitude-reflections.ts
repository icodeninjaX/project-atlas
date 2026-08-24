export const WISDOM_CATEGORIES = [
  "Gratitude",
  "Motivation",
  "Stoicism",
] as const;

export type WisdomCategory = (typeof WISDOM_CATEGORIES)[number];

type FamousQuote = {
  author: string;
  category: WisdomCategory;
  message: string;
};

const FAMOUS_WISDOM_QUOTES = [
  // Gratitude: familiar reminders to notice what is already good.
  {
    category: "Gratitude",
    message:
      "Gratitude is not only the greatest of virtues, but the parent of all the others.",
    author: "Cicero",
  },
  {
    category: "Gratitude",
    message: "Gratitude is the sign of noble souls.",
    author: "Aesop",
  },
  {
    category: "Gratitude",
    message:
      "Let us be grateful to the people who make us happy; they are the charming gardeners who make our souls blossom.",
    author: "Marcel Proust",
  },
  {
    category: "Gratitude",
    message:
      "Thanks are the highest form of thought, and gratitude is happiness doubled by wonder.",
    author: "G. K. Chesterton",
  },
  {
    category: "Gratitude",
    message:
      "I am grateful for what I am and have. My thanksgiving is perpetual.",
    author: "Henry David Thoreau",
  },
  {
    category: "Gratitude",
    message:
      "Reflect upon your present blessings, of which every person has plenty.",
    author: "Charles Dickens",
  },
  {
    category: "Gratitude",
    message: "Nothing is more honorable than a grateful heart.",
    author: "Seneca",
  },
  {
    category: "Gratitude",
    message:
      "A wise person does not grieve for what is missing, but rejoices in what is present.",
    author: "Epictetus",
  },
  {
    category: "Gratitude",
    message:
      "When you arise in the morning, think of what a privilege it is to be alive, to think, to enjoy, to love.",
    author: "Marcus Aurelius",
  },
  {
    category: "Gratitude",
    message:
      "So much has been given to me; I have no time to ponder over that which has been denied.",
    author: "Helen Keller",
  },
  {
    category: "Gratitude",
    message: "Think of all the beauty still left around you and be happy.",
    author: "Anne Frank",
  },
  {
    category: "Gratitude",
    message:
      "Let gratitude be the pillow upon which you kneel to say your nightly prayer.",
    author: "Maya Angelou",
  },
  {
    category: "Gratitude",
    message: "Rest and be thankful.",
    author: "William Wordsworth",
  },
  {
    category: "Gratitude",
    message:
      "If the only prayer you ever say in your entire life is thank you, it will be enough.",
    author: "Meister Eckhart",
  },
  {
    category: "Gratitude",
    message: "Silent gratitude is not much use to anyone.",
    author: "Gertrude Stein",
  },
  {
    category: "Gratitude",
    message:
      "We can only be said to be alive in those moments when our hearts are conscious of our treasures.",
    author: "Thornton Wilder",
  },
  {
    category: "Gratitude",
    message:
      "Appreciation is a wonderful thing. It makes what is excellent in others belong to us as well.",
    author: "Voltaire",
  },
  {
    category: "Gratitude",
    message: "Be thankful for what you have; you will end up having more.",
    author: "Oprah Winfrey",
  },
  {
    category: "Gratitude",
    message: "Gratitude turns what we have into enough.",
    author: "Melody Beattie",
  },
  {
    category: "Gratitude",
    message:
      "The roots of all goodness lie in the soil of appreciation for goodness.",
    author: "The Dalai Lama",
  },
  {
    category: "Gratitude",
    message: "Thank you is the best prayer that anyone could say.",
    author: "Alice Walker",
  },
  {
    category: "Gratitude",
    message:
      "At times our own light goes out and is rekindled by a spark from another person.",
    author: "Albert Schweitzer",
  },
  {
    category: "Gratitude",
    message:
      "In ordinary life, we hardly realize that we receive a great deal more than we give.",
    author: "Dietrich Bonhoeffer",
  },
  {
    category: "Gratitude",
    message:
      "The thankful heart will find, in every hour, some heavenly blessings.",
    author: "Henry Ward Beecher",
  },
  {
    category: "Gratitude",
    message:
      "Gratitude can transform common days into thanksgivings and ordinary opportunities into blessings.",
    author: "William Arthur Ward",
  },
  {
    category: "Gratitude",
    message:
      "Keep your eyes open to your mercies. The person who forgets to be thankful has fallen asleep in life.",
    author: "Robert Louis Stevenson",
  },
  {
    category: "Gratitude",
    message: "Pay attention. Be astonished. Tell about it.",
    author: "Mary Oliver",
  },
  {
    category: "Gratitude",
    message:
      "When I started counting my blessings, my whole life turned around.",
    author: "Willie Nelson",
  },
  {
    category: "Gratitude",
    message:
      "Acknowledging the good that you already have in your life is the foundation for all abundance.",
    author: "Eckhart Tolle",
  },
  {
    category: "Gratitude",
    message:
      "Enjoy the little things, for one day you may look back and realize they were the big things.",
    author: "Robert Brault",
  },

  // Motivation: famous, direct encouragement to begin and keep going.
  {
    category: "Motivation",
    message: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    category: "Motivation",
    message: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
  },
  {
    category: "Motivation",
    message: "Nothing will work unless you do.",
    author: "Maya Angelou",
  },
  {
    category: "Motivation",
    message: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    category: "Motivation",
    message: "You miss one hundred percent of the shots you do not take.",
    author: "Wayne Gretzky",
  },
  {
    category: "Motivation",
    message:
      "Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence.",
    author: "Helen Keller",
  },
  {
    category: "Motivation",
    message: "If you want to lift yourself up, lift up someone else.",
    author: "Booker T. Washington",
  },
  {
    category: "Motivation",
    message: "If there is no struggle, there is no progress.",
    author: "Frederick Douglass",
  },
  {
    category: "Motivation",
    message: "The most effective way to do it is to do it.",
    author: "Amelia Earhart",
  },
  {
    category: "Motivation",
    message: "Do not count the days; make the days count.",
    author: "Muhammad Ali",
  },
  {
    category: "Motivation",
    message: "It always seems impossible until it is done.",
    author: "Nelson Mandela",
  },
  {
    category: "Motivation",
    message:
      "Faith is taking the first step even when you cannot see the whole staircase.",
    author: "Martin Luther King Jr.",
  },
  {
    category: "Motivation",
    message:
      "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
  },
  {
    category: "Motivation",
    message: "You must do the thing you think you cannot do.",
    author: "Eleanor Roosevelt",
  },
  {
    category: "Motivation",
    message: "Make each day your masterpiece.",
    author: "John Wooden",
  },
  {
    category: "Motivation",
    message:
      "Great things are done by a series of small things brought together.",
    author: "Vincent van Gogh",
  },
  {
    category: "Motivation",
    message: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  {
    category: "Motivation",
    message: "Well done is better than well said.",
    author: "Benjamin Franklin",
  },
  {
    category: "Motivation",
    message: "Energy and persistence conquer all things.",
    author: "Benjamin Franklin",
  },
  {
    category: "Motivation",
    message: "Always do what you are afraid to do.",
    author: "Ralph Waldo Emerson",
  },
  {
    category: "Motivation",
    message:
      "Go confidently in the direction of your dreams. Live the life you have imagined.",
    author: "Henry David Thoreau",
  },
  {
    category: "Motivation",
    message: "The best way out is always through.",
    author: "Robert Frost",
  },
  {
    category: "Motivation",
    message: "Ever tried. Ever failed. No matter. Try again. Fail better.",
    author: "Samuel Beckett",
  },
  {
    category: "Motivation",
    message:
      "You do not have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    category: "Motivation",
    message: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    category: "Motivation",
    message:
      "How wonderful it is that nobody need wait a single moment before starting to improve the world.",
    author: "Anne Frank",
  },
  {
    category: "Motivation",
    message:
      "Failure is simply the opportunity to begin again, this time more intelligently.",
    author: "Henry Ford",
  },
  {
    category: "Motivation",
    message:
      "Our greatest weakness lies in giving up. The surest way to succeed is to try just one more time.",
    author: "Thomas Edison",
  },
  {
    category: "Motivation",
    message:
      "I am not afraid of storms, for I am learning how to sail my ship.",
    author: "Louisa May Alcott",
  },
  {
    category: "Motivation",
    message: "Life shrinks or expands in proportion to one's courage.",
    author: "Anais Nin",
  },

  // Stoicism: practical lines from the three best-known Roman Stoics.
  {
    category: "Stoicism",
    message:
      "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "Waste no more time arguing about what a good person should be. Be one.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "If it is not right, do not do it; if it is not true, do not say it.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message: "The best revenge is not to become like the wrongdoer.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message: "The universe is change; our life is what our thoughts make it.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "Look well into yourself; there is a source of strength which will always spring up if you look.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "You could leave life right now. Let that determine what you do, say, and think.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message:
      "Do every act of your life as though it were the last act of your life.",
    author: "Marcus Aurelius",
  },
  {
    category: "Stoicism",
    message: "Some things are in our control and others are not.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "People are disturbed not by things, but by the views they take of them.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "Do not seek for events to happen as you wish, but wish events to happen as they do.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "Make the best use of what is in your power, and take the rest as it happens.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "First say to yourself what you would be; then do what you have to do.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message: "No person is free who is not master of themselves.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "If you want to improve, be content to be thought foolish and stupid.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message: "It is impossible to learn what you think you already know.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message: "Difficulties show a person what they are.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message:
      "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
  },
  {
    category: "Stoicism",
    message: "We suffer more often in imagination than in reality.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message:
      "It is not that we have a short time to live, but that we waste much of it.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "Difficulties strengthen the mind, as labor does the body.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "While we wait for life, life passes.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message:
      "Begin at once to live, and count each separate day as a separate life.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "No person was ever wise by chance.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "Associate with people who are likely to improve you.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message:
      "If one does not know to which port one is sailing, no wind is favorable.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "The greatest remedy for anger is delay.",
    author: "Seneca",
  },
  {
    category: "Stoicism",
    message: "As long as you live, keep learning how to live.",
    author: "Seneca",
  },
] as const satisfies readonly FamousQuote[];

export const WISDOM_COLLECTION_SIZE = FAMOUS_WISDOM_QUOTES.length;

export type WisdomQuote = FamousQuote & {
  collectionSize: number;
  index: number;
};

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function getWisdomQuote(index: number): WisdomQuote {
  if (!Number.isInteger(index)) {
    throw new Error(`Wisdom quote index must be an integer: ${index}`);
  }

  const normalizedIndex = positiveModulo(index, WISDOM_COLLECTION_SIZE);
  const quote = FAMOUS_WISDOM_QUOTES[normalizedIndex]!;

  return {
    ...quote,
    collectionSize: WISDOM_COLLECTION_SIZE,
    index: normalizedIndex,
  };
}

export function getRandomWisdomQuote(
  excludeIndex?: number,
  randomValue = Math.random(),
): WisdomQuote {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(
      `Random value must be between 0 (inclusive) and 1: ${randomValue}`,
    );
  }

  const normalizedExcludedIndex =
    excludeIndex === undefined
      ? undefined
      : positiveModulo(excludeIndex, WISDOM_COLLECTION_SIZE);
  const candidateCount =
    WISDOM_COLLECTION_SIZE - (normalizedExcludedIndex === undefined ? 0 : 1);
  let selectedIndex = Math.floor(randomValue * candidateCount);

  if (
    normalizedExcludedIndex !== undefined &&
    selectedIndex >= normalizedExcludedIndex
  ) {
    selectedIndex += 1;
  }

  return getWisdomQuote(selectedIndex);
}
