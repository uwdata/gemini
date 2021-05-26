import { Gemini } from "./gemini.js";
import { default as recommend, compareCost, canRecommend, allAtOnce } from "./recommender";
import { recommendForSeq,
  recommendKeyframes,
  recommendWithPath,
  canRecommendKeyframes,
  canRecommendForSeq } from "./recommender/sequence";
import { default as vl2vg4gemini, castVL2VG } from "./util/vl2vg4gemini";

const { animate, animateSequence } = Gemini;
export { animate,
  animateSequence,
  recommend,
  canRecommend,
  recommendForSeq,
  canRecommendForSeq,
  recommendKeyframes,
  canRecommendKeyframes,
  recommendWithPath,
  compareCost,
  vl2vg4gemini,
  castVL2VG,
  allAtOnce
};
