/* Built-in theme library — SUGGESTIONS only. Herb writes/edits his own prompts per verse. */
window.Themes = {
  prompts: {
    anxiety: ["A friend says, “I’m so anxious about tomorrow, I can’t sleep.” Which passage would you share?", "You’re lying awake worrying about money. What passage do you preach to yourself?"],
    contentment: ["A friend says, “I’ll finally be happy once I get that new job.” Which passage would you share?", "You’re scrolling and feeling jealous of everyone’s life. Which passage helps?"],
    strength: ["A friend says, “I can’t do this anymore, I’m out of strength.” Which passage would you share?"],
    grace: ["A friend says, “I figure God will accept me if I just keep doing good.” Which passage would you share?", "Someone asks, “Don’t I have to earn my way to heaven?” What passage answers that?"],
    salvation: ["A coworker asks, “What do Christians actually believe about being saved?” Which passage would you share?"],
    fear: ["Your kid says, “I’m scared of the dark.” Which passage would you share?"],
    provision: ["A friend says, “I don’t know how we’re going to make it this month.” Which passage would you share?"],
    guidance: ["A friend says, “I have no idea which way to go with this decision.” Which passage would you share?"],
    forgiveness: ["A friend says, “God could never forgive what I did.” Which passage would you share?"],
    temptation: ["You’re tempted and it feels impossible to resist. Which passage helps?"],
    suffering: ["A friend says, “Nothing good can come out of this mess.” Which passage would you share?"],
    love: ["Someone says, “God doesn’t really care about me.” Which passage would you share?"],
    mercy: ["A friend says, “I’m too far gone for God.” Which passage would you share?"],
  },
  // Common verses -> suggested tags (chapter:verse ranges overlapping are matched by book+chapter+verse)
  tags: {
    'John 3:16': ['salvation', 'love'], 'Romans 8:28': ['suffering'], 'Psalms 23:1': ['provision', 'fear', 'guidance'],
    'Psalms 23:2': ['provision'], 'Psalms 23:3': ['guidance'], 'Psalms 23:4': ['fear'],
    'Philippians 4:6': ['anxiety'], 'Philippians 4:7': ['anxiety'], 'Philippians 4:11': ['contentment'], 'Philippians 4:12': ['contentment'], 'Philippians 4:13': ['strength', 'contentment'],
    'Romans 4:4': ['grace'], 'Romans 4:5': ['grace', 'salvation'], 'Ephesians 2:8': ['grace', 'salvation'], 'Ephesians 2:9': ['grace'],
    'Titus 3:4': ['mercy', 'love'], 'Titus 3:5': ['grace', 'mercy', 'salvation'], 'Titus 3:6': ['grace'], 'Titus 3:7': ['grace'],
    'Isaiah 41:10': ['fear', 'strength'], 'Matthew 6:34': ['anxiety'], '1 Peter 5:7': ['anxiety'], '1 John 1:9': ['forgiveness'],
    '1 Corinthians 10:13': ['temptation'], 'Proverbs 3:5': ['guidance'], 'Proverbs 3:6': ['guidance'], 'Joshua 1:9': ['fear', 'strength'],
    'Romans 6:23': ['salvation'], 'Romans 5:8': ['love', 'salvation'], 'Hebrews 13:5': ['contentment'], 'Isaiah 40:31': ['strength'], 'Lamentations 3:22': ['mercy'], 'Lamentations 3:23': ['mercy'],
  },
  suggestTags(book, chapter, from, to) {
    const s = new Set();
    for (let v = from || 1; v <= (to || from || 1); v++) (this.tags[`${book} ${chapter}:${v}`] || []).forEach(t => s.add(t));
    return [...s];
  },
};
