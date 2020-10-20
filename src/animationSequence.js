class AnimationSequence {

  constructor(animations) {
    this.animations = animations;
    this.status = "ready";
    this.specs = animations.map(anim => anim.spec);
    this.logs = [];
    this.rawInfos = animations.map(anim => anim.rawInfo);
  }

  log(timestamp, message, info) {
    if (typeof message === "string" && typeof timestamp === "number") {
      this.logs.push({
        timestamp,
        message,
        info
      });
    }
    return this.logs;
  }

  async play (targetElm) {
    // play and return the promsie
    const globalSTime = new Date();


    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      this.log(new Date() - globalSTime, `Start the ${i}-th animated transition.`);
      await animation.play(targetElm);
      if (i < (this.animations.length - 1)) {
        const target = document.querySelector(targetElm);
        target.textContent = "";
        target.append(animation.rawInfo.eVis.htmlDiv);
      }
    }
  }
}

export { AnimationSequence };
