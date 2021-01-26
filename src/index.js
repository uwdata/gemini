import { Gemini } from "./gemini.js";
import { default as recommend, compareCost, cannotRecommend } from "./recommender";
import { recommendForSeq,
  recommendKeyframes,
  recommendWithPath,
  cannotRecommendKeyframes,
  cannotRecommendForSeq } from "./recommender/sequence";
import { default as vl2vg4gemini } from "./util/vl2vg4gemini";

const { animate, animateSequence } = Gemini;
export { animate,
  animateSequence,
  recommend,
  cannotRecommend,
  recommendForSeq,
  cannotRecommendForSeq,
  recommendKeyframes,
  cannotRecommendKeyframes,
  recommendWithPath,
  compareCost,
  vl2vg4gemini
};
