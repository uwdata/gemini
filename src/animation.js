class Animation {
  constructor(schedule, rawInfo, spec) {
    this.schedule = schedule;
    this.moments = this.schedule.moments;
    this.status = "ready";
    this.spec = spec;
    this.logs = [];
    this._queue = [];
    this.rawInfo = rawInfo;
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

  async play(targetElm) {
    this.status = "playing";
    // get moments and sort by sTime
    const { moments } = this;

    const globalSTime = new Date();
    this._start(moments[0].starting, targetElm);
    this.log(new Date() - globalSTime, "0-th moment");

    for (let i = 1; i < moments.length; i++) {
      const moment = moments[i];

      await this._end(moment).then(() => {
        const delay = Math.max(moment.time - (new Date() - globalSTime), 0);
        return new Promise(resolve => setTimeout(() => resolve(), delay));
      });
      this._start(moment.starting, targetElm);
      this.log(new Date() - globalSTime, `${i}-th moment`);

      if (i === moments.length - 1) {
        this.status = "ready";
        return;
      }
    }
  }

  _start(steps, targetElm) {
    steps.forEach(step => {
      this._queue.push({
        sTime: step.sTime,
        eTime: step.eTime,
        step,
        result: step.template(this.rawInfo, step, targetElm) // contains the promise
      });
    });
  }

  async _end(moment) {
    const { time } = moment;

    const workingSteps = this._queue.filter(item => item.eTime === time);
    for (let i = 0; i < workingSteps.length; i++) {
      await workingSteps[i].result;
    }
  }
}

export { Animation };
