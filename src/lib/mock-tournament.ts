// src/data/mock-tournament.ts

export const DEMO_TOURNAMENT = {
  id: "demo-t-1",
  name: "Friday Night Padel (Live Demo)",
  format: "mexicano",
  courts_count: 4,
  points_per_match: 21,
  status: "active",
};

export const DEMO_PLAYERS = [
  { id: "p1", name: "Alex H." },
  { id: "p2", name: "Marcus T." },
  { id: "p3", name: "Sarah W." },
  { id: "p4", name: "Elena R." },
  { id: "p5", name: "David K." },
  { id: "p6", name: "Michał S." },
  { id: "p7", name: "Sophie L." },
  { id: "p8", name: "Tom B." },
  { id: "p9", name: "Nina P." },
  { id: "p10", name: "Lucas M." },
  { id: "p11", name: "Julia C." },
  { id: "p12", name: "Kamil W." },
  { id: "p13", name: "Emma D." },
  { id: "p14", name: "Oliver J." },
  { id: "p15", name: "Anna K." },
  { id: "p16", name: "Victor O." },
];

export const DEMO_MATCHES = [
  // ==========================================
  // ROUND 1 (All Completed)
  // ==========================================
  {
    id: "m1", round: 1, court: 1, completed: true,
    a1: "p1", a2: "p2", b1: "p3", b2: "p4",
    score_a: 10, score_b: 111,
  },
  {
    id: "m2", round: 1, court: 2, completed: true,
    a1: "p5", a2: "p6", b1: "p7", b2: "p8",
    score_a: 12, score_b: 9,
  },
  {
    id: "m3", round: 1, court: 3, completed: true,
    a1: "p9", a2: "p10", b1: "p11", b2: "p12",
    score_a: 7, score_b: 14,
  },
  {
    id: "m4", round: 1, court: 4, completed: true,
    a1: "p13", a2: "p14", b1: "p15", b2: "p16",
    score_a: 13, score_b: 8,
  },

  // ==========================================
  // ROUND 2 (All Completed)
  // Re-seeded based on R1 points
  // ==========================================
  {
    id: "m5", round: 2, court: 1, completed: true,
    a1: "p9", a2: "p10", b1: "p7", b2: "p8",
    score_a: 15, score_b: 6,
  },
  {
    id: "m6", round: 2, court: 2, completed: true,
    a1: "p1", a2: "p2", b1: "p13", b2: "p14",
    score_a: 11, score_b: 10,
  },
  {
    id: "m7", round: 2, court: 3, completed: true,
    a1: "p15", a2: "p16", b1: "p3", b2: "p4",
    score_a: 14, score_b: 7,
  },
  {
    id: "m8", round: 2, court: 4, completed: true,
    a1: "p5", a2: "p6", b1: "p11", b2: "p12",
    score_a: 6, score_b: 15,
  },

  // ==========================================
  // ROUND 3 (Currently Active)
  // 1 match finished, 3 pending for the simulation
  // ==========================================
  {
    id: "m9", round: 3, court: 1, completed: true,
    a1: "p1", a2: "p2", b1: "p9", b2: "p10",
    score_a: 9, score_b: 12,
  },
  {
    id: "m10", round: 3, court: 2, completed: false,
    a1: "p7", a2: "p8", b1: "p5", b2: "p6",
    score_a: 0, score_b: 0,
  },
  {
    id: "m11", round: 3, court: 3, completed: false,
    a1: "p13", a2: "p14", b1: "p15", b2: "p16",
    score_a: 0, score_b: 0,
  },
  {
    id: "m12", round: 3, court: 4, completed: false,
    a1: "p3", a2: "p4", b1: "p11", b2: "p12",
    score_a: 0, score_b: 0,
  },
];