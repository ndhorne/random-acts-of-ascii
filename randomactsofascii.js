/*
Copyright 2021, 2022 Nicholas D. Horne

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict";

let phrase, phrases, challenge, index, previousIndices, startTime, state;
let charsRevealed, wordsRevealed;
let revealDelay = 200, infiniswapDelay = 5000;
let titleInterval, infiniswapInterval;
let revealWordTimeout, revealPhraseTimeout;
let responseElementBlinkTimeout;

const titleElem = document.getElementById("title");
const challengeElem = document.getElementById("challenge");
const responseElem = document.getElementById("response");
const hintElem = document.getElementById("hintText");
const hintButton = document.getElementById("getHint");
const answerButton = document.getElementById("answer");
const passButton = document.getElementById("pass");
const aboutButton = document.getElementById("aboutDialog");
const revealLetterButton = document.getElementById("revealLetter");
const revealWordButton = document.getElementById("revealWord");
const revealPhraseButton = document.getElementById("revealPhrase");
const infiniswapCheckbox = document.getElementById("infiniswap");
const infiniswapRange = document.getElementById("infiniswapRange");

const aboutModal = document.getElementById("aboutModal");
const closeAbout = document.getElementById("closeAbout");

const winModal = document.getElementById("winModal");
const winTextElem = document.getElementById("winText");
const closeWinModal = document.getElementById("closeWinModal");

const errorModal = document.getElementById("errorModal");
const errorStackElem = document.getElementById("errorStack");

challengeElem.update = function() {
  if (charsRevealed > 0) {
    let revealed;
    
    revealed = document.createElement("span");
    revealed.classList.add("revealed");
    revealed.innerHTML = challenge.slice(0, charsRevealed);
    
    this.innerHTML =
      revealed.outerHTML + challenge.slice(charsRevealed)
    ;
  } else {
    this.innerHTML = challenge;
  }
}

function clearTimers() {
  clearInterval(infiniswapInterval);
  clearTimeout(revealWordTimeout);
  clearTimeout(revealPhraseTimeout);
  clearTimeout(responseElementBlinkTimeout);
  responseElem.style.backgroundColor = "initial";
}

function randomizeString(
  strArg, delimiters = [" ", "-"], exclusions = [], passes = 1
) {
  let delimiter = delimiters.shift();
  let strArray = strArg.split(delimiter);
  
  for (let i = 0; i < passes; i++) {
    strArray = strArray.map(strElem => {
      if (delimiters[0] ? !strElem.includes(delimiters[0]) : true) {
        let charArray = strElem.split("");
        
        for (let i = 0; i < charArray.length; i++) {
          let randomIndex, temp;
          
          if (exclusions.includes(charArray[i])) {
            continue;
          }
          
          do {
            randomIndex = Math.floor(Math.random() * charArray.length);
          } while (exclusions.includes(charArray[randomIndex]));
          
          temp = charArray[i];
          charArray[i] = charArray[randomIndex];
          charArray[randomIndex] = temp;
        }
        
        return charArray.join("");
      } else {
        return randomizeString(strElem, delimiters, exclusions);
      }
    });
  }
  
  return strArray.join(delimiter);
}

function isFullyRandom(str1, str2, delimiter = " ", exclusions = []) {
  if (typeof str1 != "string" || typeof str2 != "string") {
    throw new Error("Arguments must both be of type string");
  }
  if (str1.length != str2.length) {
    throw new Error("Arguments must be of equal length");
  }
  
  let str1Array = str1.split(delimiter);
  let str2Array = str2.split(delimiter);
  
  outer: for (let i = 0; i < str1Array.length; i++) {
    if (str1Array[i].length == 1) {
      continue;
    }
    
    let occurences = {}, halfLength = str1Array[i].length / 2;;
    Array.prototype.forEach.call(str1Array[i], function(char) {
      occurences[char] = (occurences[char] || 0) + 1;
    });
    
    for (let char in occurences) {
      if (occurences[char] > halfLength) {
        if (str1Array[i] == str2Array[i]) {
          return false;
        } else {
          continue outer;
        }
      }
    }
    
    for (let j = 0; j < str1Array[i].length; j++) {
      if (str1Array[i][j] == str2Array[i][j]) {
        if (exclusions.includes(str1Array[i][j])) {
          continue;
        } else {
          return false;
        }
      }
    }
  }
  
  return true;
}

function discreteRandomSwap(
  strArg, delimiters = [" ", "-"], exclusions = [], skip = []
) {
  let delimiter = delimiters.shift();
  let strArray = strArg.split(delimiter);
  let randomIndex;
  
  if (skip.length < strArg.split(" ").length) {
    do {
      randomIndex = Math.floor(Math.random() * strArray.length);
    } while (skip.includes(randomIndex));
    
    strArray = strArray.map(function(word, currentIndex) {
      if (currentIndex != randomIndex) {
        return word;
      } else {
        if (delimiters[0] ? word.includes(delimiters[0]) : false) {
          return discreteRandomSwap(word, delimiters, exclusions).str;
        } else {
          let wordArray, rand1, rand2, temp;
          
          wordArray = word.split("");
          
          do {
            do {
              rand1 = Math.floor(Math.random() * wordArray.length);
            } while (exclusions.includes(wordArray[rand1]));
            do {
              rand2 = Math.floor(Math.random() * wordArray.length);
            } while (exclusions.includes(wordArray[rand2]));
          } while (wordArray[rand1] == wordArray[rand2]);
          
          temp = wordArray[rand1];
          wordArray[rand1] = wordArray[rand2];
          wordArray[rand2] = temp;
          
          return wordArray.join("");
        }
      }
    });
  }
  
  return {
    str: strArray.join(delimiter),
    skipped: skip,
    last: randomIndex
  };
}

function infiniswap(timeout) {
  let skip = [];
  
  infiniswapInterval = setInterval(function() {
    if (charsRevealed > phrase.lastIndexOf(" ") + 1) {
      clearInterval(infiniswapInterval);
      return;
    }
    
    let obj;
    
    function containsSolution(str1, str2, skip = []) {
      if (typeof str1 != "string" || typeof str2 != "string") {
        throw new Error("Arguments must both be of type string");
      }
      if (str1.length != str2.length) {
        throw new Error("Arguments must be of equal length");
      }
      
      let str1Array = str1.split(" ");
      let str2Array = str2.split(" ");
      
      for (let i = 0; i < str1Array.length; i++) {
        if (skip.includes(i) || str1Array[i].length < 3) {
          continue;
        }
        
        if (str1Array[i] == str2Array[i]) {
          return true;
        }
      }
      
      return false;
    }
    
    function skipAudit() {
      let strArray = challenge.split(" ");
      
      if (skip.length == phrase.split(" ").length) {
        skip = [];
      }
      
      strArray.forEach(function(word, index) {
        function isRevealed() {
          if (index < wordsRevealed) {
            return true;
          }
          
          let slice, sliceArray;
          
          do {
            slice = challenge.slice(
              0,
              challenge.indexOf(
                word, (slice ? slice.length : null)
              ) + 1
            );
            sliceArray = slice.split(" ");
          } while (sliceArray.length - 1 < index);
          
          if (slice.length <= charsRevealed) {
            return true;
          }
          
          return false;
        }
        
        if (
          (word.length == 1 || isRevealed()) && !skip.includes(index)
        ) {
          skip.push(index);
        }
      });
    }
    
    skipAudit();
    
    do {
      do {
        obj = discreteRandomSwap(challenge, [" ", "-"], [], skip);
      } while (containsSolution(phrase, obj.str, skip));
      
      if (obj.last == undefined) {
        skipAudit();
      }
    } while (
      obj.last == undefined
      && charsRevealed <= phrase.lastIndexOf(" ") + 1
    );
    
    if (obj.last != undefined) {
      skip.push(obj.last);
    }
    
    challenge = obj.str;
    challengeElem.update();
  }, timeout);
}

function checkWidgets(widgets) {
  if (!(widgets instanceof Array)) {
    throw new Error("Array expected");
  }
  
  if (widgets.length == 0) {
    console.error("Array empty, nothing to do");
  }
  
  widgets.forEach(function(widget) {
    if (
      !(
        widget instanceof HTMLButtonElement
        || widget instanceof HTMLInputElement
      )
    ) {
      throw new Error("Unexpected/invalid widget encountered");
    }
  });
}

function disableWidgets(...widgets) {
  try {
    checkWidgets(widgets);
  } catch (e) {
    errorStackElem.innerHTML = `${e.stack}`;
    errorModal.style.display = "block";
    return;
  }
  
  widgets.forEach(function(element) {
    element.disabled = true;
  });
}

function enableWidgets(...widgets) {
  try {
    checkWidgets(widgets);
  } catch (e) {
    errorStackElem.innerHTML = `${e.stack}`;
    errorModal.style.display = "block";
    return;
  }
  
  widgets.forEach(function(element) {
    element.disabled = false;
  });
}

function setChallenge(indexArg) {
  if (indexArg != undefined) {
    clearTimers();
  }
  
  state = 0;
  charsRevealed = 0;
  wordsRevealed = 0;
  hintElem.innerHTML = "";
  responseElem.value = "";
  
  if (
    typeof indexArg != "number"
    || indexArg < 0
    || indexArg >= phrases.length
  ) {
    if (previousIndices.length == phrases.length) {
      console.log("Phrases exhausted, starting over");
      previousIndices = [];
    }
    do {
      index = Math.floor(Math.random() * phrases.length);
    } while (previousIndices.includes(index));
    previousIndices.push(index);
  } else {
    index = indexArg;
  }
  
  phrase =
    phrases[index].phrase.toLowerCase().trim().replace(/ {2,}/g, " ")
  ;
  
  do {
    challenge = randomizeString(phrase);
  } while (!isFullyRandom(phrase, challenge, " ", ["-"]));
  
  challengeElem.update();
  
  if (infiniswapCheckbox.checked) {
    infiniswap(infiniswapDelay);
  }
  
  enableWidgets(...(phrases[index].hint ? [hintButton] : []).concat(
    [
      aboutButton, responseElem,
      revealLetterButton, revealWordButton, revealPhraseButton
    ]
  ));
  
  responseElem.focus();
  
  startTime = Date.now();
}

function revealNextChar(current = charsRevealed) {
  let randomizedIndex = challenge.indexOf(phrase[current], current);
  let strArray = challenge.split("");
  let temp;
  
  temp = strArray[current];
  strArray[current] = strArray[randomizedIndex];
  strArray[randomizedIndex] = temp;
  
  challenge = strArray.join("");
  
  if (phrase[current] == " ") {
    wordsRevealed++;
  }
  
  if (current < phrase.length) {
    charsRevealed = ++current;
    challengeElem.update();
  }
  
  if (
    current == phrase.length
    && wordsRevealed < phrase.split(" ").length
  ) {
    wordsRevealed++;
  }
  
  return {
    char: phrase[current - 1],
    index: current - 1,
    next: current
  };
}

function revealNextLetter(
  current = charsRevealed, exclusions = [" ", "-"]
) {
  function seek(current) {
    while (exclusions.includes(phrase[current])) {
      current = revealNextChar(current).next;
    }
    
    return current;
  }
  
  current = seek(current);
  current = revealNextChar(current).next;
  seek(current);
}

function revealUntilNextCharMismatch(
  current = charsRevealed, stopChars = []
) {
  function seek(current) {
    while (stopChars.includes(phrase[current])) {
      current = revealNextChar(current).next;
    }
    
    return current;
  }
  
  current = seek(current);
  
  while (
    phrase[current] == challenge[current]
    && current < phrase.length
    && !stopChars.includes(phrase[current])
  ) {
    current = revealNextChar(current).next;
  }
  
  revealNextChar(current);
}

function revealUntilNextWordMismatch() {
  let charsUntilNextWordBoundary;
  
  if (charsRevealed < phrase.lastIndexOf(" ")) {
    while (phrase[charsRevealed] == " ") {
      revealNextChar();
    }
    
    charsUntilNextWordBoundary = phrase.indexOf(" ", charsRevealed);
  } else {
    charsUntilNextWordBoundary = phrase.length;
  }
  
  while (charsRevealed < charsUntilNextWordBoundary) {
    revealUntilNextCharMismatch(charsRevealed, [" "]);
  }
}

function revealUntilEndOfPhrase() {
  while (charsRevealed < phrase.length) {
    revealUntilNextCharMismatch();
  }
}

function revealUntilNextWordMismatchTimeoutDelayed(timeout) {
  let charsUntilNextWordBoundary;
  
  if (charsRevealed < phrase.lastIndexOf(" ")) {
    while (phrase[charsRevealed] == " ") {
      revealNextChar();
    }
    
    charsUntilNextWordBoundary = phrase.indexOf(" ", charsRevealed);
  } else {
    charsUntilNextWordBoundary = phrase.length;
  }
  
  (function foo(timeout) {
    revealWordTimeout = setTimeout(function() {
      if (charsRevealed < charsUntilNextWordBoundary) {
        revealUntilNextCharMismatch(charsRevealed, [" "]);
        foo(timeout);
      }
    }, timeout);
  })(timeout);
}

function revealUntilEndOfPhraseTimeoutDelayed(timeout) {
  (function foo(timeout) {
    revealPhraseTimeout = setTimeout(function() {
      if (charsRevealed < phrase.length) {
        revealUntilNextCharMismatch();
        foo(timeout);
      }
    }, timeout);
  })(timeout);
}

function about() {
  let aboutText = [
    "Random Acts of ASCII",
    "A pointless diversion by Nicholas D. Horne",
    "Unscramble common but obfuscated colloquial phrases, sayings, "
    + "expressions, and idioms of the English language. The scope of "
    + "randomization does not extend beyond the limits defined by the "
    + "various commonly accepted linguistic word boundaries "
    + "(spaces, hyphens, etc.) of the phrases provided. Hints and "
    + "revelations are available to be revealed at the player's own "
    + "discretion; reserve them for particularly cryptic challenges or "
    + "\"reserve\" them for any challenges.",
    "GNU GPLv3 licensed source code available at "
    + "https://github.com/ndhorne/random-acts-of-ascii"
  ];
  
  alert(
    aboutText.join("\n\n")
  );
}

function setTitle() {
  let titleStr = "Random Acts of ASCII";
  let titleRandom, doneIndices = [];
  
  do {
    titleRandom = randomizeString(titleStr);
  } while (!isFullyRandom(titleStr, titleRandom));
  
  titleElem.innerHTML = titleRandom;
  
  titleInterval = setInterval(function() {
    let titleArray = titleElem.innerHTML.split("");
    let rand1, rand2, temp;
    
    do {
      rand1 = Math.floor(Math.random() * titleArray.length);
    } while (doneIndices.includes(rand1));
    
    do {
      rand2 = Math.floor(Math.random() * titleArray.length);
    } while (doneIndices.includes(rand2));
    
    if (
      (titleStr[rand1] != titleArray[rand1])
      && (titleStr[rand2] != titleArray[rand2])
    ) {
      temp = titleArray[rand1];
      titleArray[rand1] = titleArray[rand2];
      titleArray[rand2] = temp;
    }
    
    if (titleStr[rand1] == titleArray[rand1]) {
      doneIndices.push(rand1);
    }
    
    if (titleStr[rand2] == titleArray[rand2]) {
      doneIndices.push(rand2);
    }
    
    titleElem.innerHTML = titleArray.join("");
    
    if (titleElem.innerHTML == titleStr) {
      clearInterval(titleInterval);
    }
  }, 15);
}

function responseElementBlink(
  times = 3, timeout = 225, color = "red"
) {
  responseElementBlinkTimeout = setTimeout(function() {
    responseElem.style.backgroundColor = color;
    
    responseElementBlinkTimeout = setTimeout(function() {
      responseElem.style.backgroundColor = "initial";
      if (--times > 0) {
        responseElementBlink(times, timeout, color);
      }
    }, timeout);
  }, timeout);
}

//formats and returns time value in seconds as human readable string
function getHumanReadableTimeString(time) {
  let hours, minutes, seconds, result = "";
  
  hours = Math.floor(time / 3600);
  minutes = Math.floor(time % 3600 / 60);
  seconds = Math.floor(time % 3600 % 60);
  
  if (hours > 0) {
    result += hours + " hour";
    if (hours > 1) result += "s";
  }
  if (minutes > 0) {
    result += result ? ", " : "";
    if (seconds == 0 && hours > 0) result += "and ";
    result += minutes + " minute";
    if (minutes > 1) result += "s";
  }
  if (seconds > 0) {
    result += result ? ", " : "";
    if (hours > 0 || minutes > 0) result += "and ";
    result += seconds + " second";
    if (seconds > 1) result += "s";
  }
  
  return result;
}

function initGame() {
  previousIndices = [];
  responseElem.value = "";
  infiniswapRange.value = 5;
  infiniswapCheckbox.checked = true;
  
  setTitle();
  
  responseElem.addEventListener("keyup", function(event) {
    if (responseElem.value != "") {
      answerButton.disabled = false;
    } else {
      answerButton.disabled = true;
    }
    
    if (event.keyCode === 13) {
      answerButton.click();
    }
  }, false);
  
  answerButton.addEventListener("click", function(event) {
    function numberOf(str, chars = [" ", "-"]) {
      let count = 0;
      
      Array.prototype.forEach.call(str, function(char) {
        if (chars.includes(char)) {
          count++;
        }
      });
      
      return count;
    }
    
    if (responseElem.value == "") {
      return;
    }
    else if (
      responseElem.value.toLowerCase().trim().replace(/ {2,}/g, " ")
      == phrase
    ) {
      let winStr;
      
      clearTimers();
      state = 1;
      challengeElem.innerHTML = phrase;
      
      winStr =
        "\""
        + phrase[0].toUpperCase()
        + phrase.slice(1)
        + "\""
        + " solved in "
        + getHumanReadableTimeString(
          (((Date.now() - startTime) / 1000).toFixed(2))
        )
        + (
          charsRevealed > 0
          ? " with "
            + (
              charsRevealed - numberOf(phrase.slice(0, charsRevealed))
            )
            + " letter"
            + (
              charsRevealed > 1
              ? "s"
              : ""
            )
            + " revealed."
          : "."
        )
        + (
          hintElem.innerHTML
          ? " Did the hint help?"
          : ""
        )
      ;
      
      //alert(winStr);
      
      responseElem.blur();
      answerButton.blur();
      
      disableWidgets(
        answerButton, hintButton, aboutButton, responseElem,
        revealLetterButton, revealWordButton, revealPhraseButton
      );
      
      setTimeout(() => {
        winTextElem.innerHTML = winStr;
        winModal.style.display = "block";
      }, 750);
      
      //setChallenge();
    } else {
      clearTimeout(responseElementBlinkTimeout);
      responseElem.style.backgroundColor = "initial";
      responseElementBlink(3, 225, "red");
      //alert("Incorrect, please try again");
    }
  }, false);
  
  passButton.addEventListener("click", function(event) {
    clearTimers();
    
    if (state == 0) {
      previousIndices.pop();
    }
    
    disableWidgets(
      answerButton, hintButton, aboutButton, responseElem,
      revealLetterButton, revealWordButton, revealPhraseButton
    );
    
    if (passButton.innerHTML != "Pass") {
      passButton.innerHTML = "Pass";
    }
    
    setChallenge();
  }, false);
  
  hintButton.addEventListener("click", function(event) {
    hintElem.innerHTML = phrases[index].hint;
    //responseElem.focus();
  }, false);
  
  revealLetterButton.addEventListener("click", function(event) {
    revealNextLetter();
    //responseElem.focus();
  }, false);
  
  revealWordButton.addEventListener("click", function(event) {
    revealUntilNextWordMismatchTimeoutDelayed(revealDelay);
    //responseElem.focus();
  }, false);
  
  revealPhraseButton.addEventListener("click", function(event) {
    revealUntilEndOfPhraseTimeoutDelayed(revealDelay);
    //responseElem.focus();
  }, false);
  
  aboutButton.addEventListener("click", function(event) {
    aboutModal.style.display = "block";
  }, false);
  
  infiniswapCheckbox.addEventListener("change", function(event) {
    if (infiniswapCheckbox.checked) {
      if (infiniswapDelay > 0) {
        infiniswap(infiniswapDelay);
      }
      infiniswapRange.disabled = false;
    } else {
      clearInterval(infiniswapInterval);
      infiniswapRange.disabled = true;
    }
    
    //responseElem.focus();
  }, false);
  
  infiniswapRange.addEventListener("change", function(event) {
    clearInterval(infiniswapInterval);
    
    infiniswapDelay = event.target.value * 1000;
    
    if (infiniswapDelay > 0 && infiniswapCheckbox.checked) {
      infiniswap(infiniswapDelay);
    }
  }, false);
  
  closeAbout.addEventListener("click", function(event) {
    aboutModal.style.display = "none";
    //responseElem.focus();
  }, false);
  
  closeWinModal.addEventListener("click", event => {
    winModal.style.display = "none";
    setChallenge();
  }, false);
  
  window.addEventListener("click", event => {
    if (event.target == aboutModal) {
      aboutModal.style.display = "none";
      //responseElem.focus();
    }
    
    if (event.target == winModal) {
      winModal.style.display = "none";
      setChallenge();
    }
  }, false);
  
  document.addEventListener("keyup", event => {
    if (event.key == "Escape" && aboutModal.style.display == "block") {
      aboutModal.style.display = "none";
      //responseElem.focus();
    }
    
    if (event.key == "Enter" && winModal.style.display == "block") {
      winModal.style.display = "none";
      setChallenge();
    }
    
    if (event.key == "Escape" && winModal.style.display == "block") {
      winModal.style.display = "none";
      passButton.innerHTML = "Next";
      passButton.focus();
    }
  }, false);
  
  setChallenge();
  enableWidgets(passButton);
}

async function initPhrases() {
  try {
    let response = await fetch("phrases.json");
    let phrases = JSON.parse(await response.text());
    
    return phrases;
  } catch (e) {
    console.error(e);
  }
}

initPhrases().then(function(result) {
  phrases = result.english;
  
  initGame();
});
