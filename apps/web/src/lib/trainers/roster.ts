export const TRAINERS = [
  { id: "ethan", name: "Ethan" },
  { id: "lance", name: "Lance" },
  { id: "silver", name: "Silver" },
  { id: "lyra", name: "Lyra" },
] as const;

export type TrainerId = (typeof TRAINERS)[number]["id"];
export type TrainerPicks = [TrainerId, TrainerId];

export function trainerFrom(value: string | null | undefined, side: 0 | 1 = 0) {
  return TRAINERS.find((trainer) => trainer.id === value) ?? TRAINERS[side];
}

export const trainerSprite = (id: TrainerId, facing: "front" | "back") =>
  `/trainers/${id}${facing === "front" ? "-front" : ""}.png`;
