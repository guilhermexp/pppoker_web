import { createTRPCRouter } from "../../init";
import { pokerMembersRouter } from "./members";
import { pppokerRouter } from "./pppoker";
import { pokerRoomsRouter } from "./rooms";

export const pokerRouter = createTRPCRouter({
  pppoker: pppokerRouter,
  rooms: pokerRoomsRouter,
  members: pokerMembersRouter,
});
