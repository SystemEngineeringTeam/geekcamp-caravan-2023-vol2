const { Command } = require("@tauri-apps/api/shell");
const { resolveResource } = require("@tauri-apps/api/path");

let nowPage = 0;
let nowLine = 0;
let stack;

window.onload = () => {
  initLog();
  initSetting();
  initSoundrecognize();
};

// wait関数
const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));

(function ($) {
  $.fn.visible = function (visible) {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  };

  $.fn.paperstack = function (options) {
    nowLine = 0;
    this.sheets = this.children();
    this.currentPage = 0;
    nowPage = this.currentPage;
    this.nextBtn = $(options.next);
    this.prevBtn = $(options.prev);

    this.next = () => {
      //nextを押した時の処理
      if (this.currentPage < this.sheets.length - 1) {
        this.currentPage++;
        nowPage = this.currentPage;
        this.sheetOrder.unshift(this.sheetOrder.pop());
        this._changePage("next");
      } else {
        //ページがマックスに達した時
        ChangeStackAnimation(); //したいってもどる
        (async () => {
          await wait(1500);
          this.currentPage = 0;
          this.sheetOrder.unshift(this.sheetOrder.pop());
          $(".stack").paperstack({});
        })();
      }
    };

    this.previous = () => {
      //prevを押した時の処理

      if (this.currentPage > 0) {
        this.currentPage--;
        this.sheetOrder.push(this.sheetOrder.shift());
        this._changePage("prev");
      }
    };

    this.nextBtn.click(this.next);
    this.prevBtn.click(this.previous);

    this.setPage = function (pageNum) {
      if (pageNum > this.sheets.length) {
        pageNum = this.sheets.length;
      } else if (pageNum < 0) {
        pageNum = 0;
      }

      let diff = pageNum - this.currentPage;
      let func = diff > 0 ? this.next : this.previous;

      let counter = 0;
      let interval = setInterval(() => {
        func();
        if (++counter > Math.abs(diff)) {
          clearInterval(interval);
        }
      }, 100);
    };

    this._changePage = (source) => {
      let toMove;
      switch (source) {
        case "next":
          toMove = $(this.sheets[this.currentPage - 1]);
          break;
        case "prev":
          toMove = $(this.sheets[this.currentPage]);
          break;
        case "set":
          toMove = $(this.sheets[this.currentPage]);
      }

      if (toMove) {
        toMove.css("left", "120%");
        toMove.css("z-index", this.sheets.length + 1);
        setTimeout(() => {
          toMove.css("left", "0");
          this._arrangeSheets(source);
        }, 300);
      } else {
        this._arrangeSheets(source);
      }
    };

    this._arrangeSheets = (source) => {
      //次を押すたびに呼ばれる
      for (let i = 0; i < this.sheets.length; i++) {
        let sheet = $(this.sheets[i]);

        sheet.css("z-index", this.sheets.length - this.sheetOrder[i] + 1);

        if (source === "initial") {
          if (i !== this.currentPage) {
            sheet.css(
              "transform",
              "rotate(" + Math.round(Math.random() * 3 + 1) + "deg"
            );
          } else {
            sheet.css("transform", "rotate(0deg)");
          }
        }
      }

      $(this.sheets[this.currentPage]).css("transform", "rotate(0deg)");
      if (source === "next") {
        $(this.sheets[this.currentPage - 1]).css(
          "transform",
          "rotate(" + Math.round(Math.random() * 5) + "deg"
        );
      } else if (source === "prev") {
        $(this.sheets[this.currentPage + 1]).css(
          "transform",
          "rotate(" + Math.round(Math.random() * 5) + "deg"
        );
      }
    };

    this.sheetOrder = Array.from(Array(this.sheets.length).keys());
    this._changePage("initial");

    return this;
  };
})(jQuery);

//全ての紙が書けなくなった時
const ChangeStackAnimation = async (ms) => {
  const stack = document.getElementById("stack");

  stack.animate(
    [
      //アニメーション
      { top: 0 + "px" },
      { top: 800 + "px" },
      { top: 0 + "px" },
    ],
    {
      duration: 1000,
    }
  );

  console.log("wait");

  for (let i = 1; i < 6; i++) {
    //ページ番号の再振り分け & 角度戻す
    let stack = document.getElementById("stack_" + i);
    let deleteLog = document.getElementById("content_" + i);
    stack.style.transform = "rotate(" + 0 + "deg)";

    while (deleteLog.lastChild) {
      deleteLog.removeChild(deleteLog.lastChild);
    }
  }

  let stack_1 = document.getElementById("stack_1");
  stack_1.style.zIndex = 100;
};

// 動作の定義
const motions = {
  break: {
    text: "紙を短く破ったとき",
    img: "./images/broken.png",
    exeId: null,
  },
};

// applescript の定義
const executes = {
  delete: {
    text: ["コードを", "全て消す"],
    file: "delete.applescript",
  },
  next: {
    text: ["スライドを", "進める"],
    file: "next-slide.applescript",
  },
  previous: {
    text: ["スライドを", "戻す"],
    file: "previous-slide.applescript",
  },
  start: {
    text: ["スライドを", "始める"],
    file: "start-slide.applescript",
  },
  finish: {
    text: ["アプリを", "終了する"],
    file: "quiet-app.applescript",
  },
  none: {
    text: ["何もしない"],
    file: "",
  },
};
const executesIds = Object.keys(executes);

// ログ関係の初期化
function initLog() {
  const stackEle = document.getElementById("stack");
  for (let i = 1; i <= 5; i++) {
    const sheet = document.createElement("div");
    sheet.classList.add("sheet");
    sheet.id = `stack_${i}`;
    sheet.innerHTML = `
      <div class="paper-main">
        <div class="page-num">No.<span id="page_${i}"></span>
        </div>
        <div class="page-header"></div>
        <div class="page-header" data-text="ログ"></div>
        <div class="content" id="content_${i}"></div>
      </div>
    `;
    stackEle.appendChild(sheet);
  }

  stack = $("#stack").paperstack({});

  let pages = [...document.getElementsByClassName("page-num")];
  pages.forEach((page, i) => {
    page.textContent = `No. ${i + 1}`;
  });
}

// ログを追加する
async function writeLog(log) {
  const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  nowLine++;

  let delay = 0;
  if (nowLine == 18) {
    delay = 300;
    nowLine = 1;
    stack.next();

    if (nowPage == 5) delay = 500;
  }

  await wait(delay);

  const now = new Date();
  const h = ("00" + now.getHours()).slice(-2);
  const s = ("00" + now.getSeconds()).slice(-2);
  const m = ("00" + now.getMilliseconds()).slice(-2);

  const writePage = document.getElementById(`content_${nowPage + 1}`);
  const span = document.createElement("span");
  span.innerHTML = `<span class="time">${h}:${s}.${m}</span>${log}\n`;
  writePage.append(span);
}

// 設定の初期化
function initSetting() {
  const stickyContainer = document.getElementById("sticky-note-container");

  const motion = motions["break"];
  motion.exeId = executesIds[0];
  const exeText = executes[motion.exeId].text;

  const stickyNote = document.getElementsByClassName("sticky-note")[0];
  const textEle = stickyNote.getElementsByClassName("execute-text")[0];
  textEle.innerHTML = exeText.join("<br>");
  stickyNote.addEventListener("click", () => changeExecute(stickyNote, motion));
}

// 実行コマンドの紐付けの変更
function changeExecute(sticky, motion) {
  const currentExeIndex = executesIds.indexOf(motion.exeId);
  const nextExeIndex = (currentExeIndex + 1) % executesIds.length;
  const exeId = executesIds[nextExeIndex];

  const textEle = sticky.getElementsByClassName("execute-text")[0];
  textEle.innerHTML = executes[exeId].text.join("<br>");
  motion.exeId = exeId;
}

// スライドを操作する
async function executeToSlide(motionId) {
  if (!motions[motionId]) return;

  const exeId = motions[motionId].exeId;
  if (exeId == "none") return;

  const exeTexts = executes[exeId].text;
  const file = executes[exeId].file;

  const path = await resolveResource(`osa/${file}`);
  new Command("run-osascript", [path]).execute();

  writeLog(exeTexts.join(""));
}

// 音声認識の初期化
async function initSoundrecognize() {
  const recognizer = await createModel();
  const classLabels = recognizer.wordLabels();
  // 変数を宣言
  const resScores = [0, 0];
  const counter = [false, false, false, false];
  let isBreakMiddle = false;

  recognizer.listen(
    (result) => {
      const score = result.scores[0];
      resScores.push(score);
      resScores.shift();
      counter.shift();

      // 平均値を取得する
      const scoresAvg = resScores.reduce((a, b) => a + b) / resScores.length;
      // counter に true が含まれているか
      const isCounterTrue = counter.includes(true);
      console.log(score.toFixed(2), scoresAvg.toFixed(2));

      // ここから判定
      if (scoresAvg >= 0.9) {
        counter.push(true);

        // 破き始め
        if (!isBreakMiddle && !isCounterTrue) {
          console.info("破きはじめた");
          isBreakMiddle = true;
          executeToSlide(classLabels[0]);
        }
      } else {
        counter.push(false);

        // 破き終わり
        if (isBreakMiddle) {
          console.info("破きおわった");
          isBreakMiddle = false;
        }
      }
    },
    {
      probabilityThreshold: 0.75,
      includeSpectrogram: true,
      overlapFactor: 0.5,
    }
  );
}

// 音声認識のモデルを作成
async function createModel() {
  const URL = "https://gist.githubusercontent.com/SatooRu65536/681066f535759bc1c52f4c9ad5ca539b/raw/f26aa65cbb337f7af76c1f1de3698b53c554972c/";
  const checkpointURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  const recognizer = speechCommands.create(
    "BROWSER_FFT",
    undefined,
    checkpointURL,
    metadataURL
  );
  await recognizer.ensureModelLoaded();

  return recognizer;
}
