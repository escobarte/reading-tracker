import type { Dictionary } from "@/i18n/types";

export type PauseReasonCode =
  | "pause_no_time"
  | "pause_other_book"
  | "pause_break"
  | "drop_not_for_me"
  | "drop_boring"
  | "drop_wrong_time"
  | "other";

export const PAUSE_REASON_CODES: PauseReasonCode[] = ["pause_no_time", "pause_other_book", "pause_break", "other"];
export const DROP_REASON_CODES: PauseReasonCode[] = ["drop_not_for_me", "drop_boring", "drop_wrong_time", "other"];

export function pauseReasonLabel(code: string, t: Dictionary): string {
  switch (code) {
    case "pause_no_time":
      return t.pauseDialog.reasonPauseNoTime;
    case "pause_other_book":
      return t.pauseDialog.reasonPauseOtherBook;
    case "pause_break":
      return t.pauseDialog.reasonPauseBreak;
    case "drop_not_for_me":
      return t.pauseDialog.reasonDropNotForMe;
    case "drop_boring":
      return t.pauseDialog.reasonDropBoring;
    case "drop_wrong_time":
      return t.pauseDialog.reasonDropWrongTime;
    case "other":
      return t.pauseDialog.reasonOther;
    default:
      return code;
  }
}
