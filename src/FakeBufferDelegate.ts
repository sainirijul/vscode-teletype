"use strict";

const assert = require('assert');

export default class FakeBufferDelegate {
    private text: any;
    private didSetText: any;
    private disposed!: boolean;
    private onGetText: any;
    private onSetText: any;
    private onUpdateText: any;
    private onInsert: any;
    private onDelete: any;
    constructor({ text, didSetText}: { text: any; didSetText: any}) {
      this.text = text;
      this.didSetText = didSetText;
      console.log("new buffer :" + text);
    }
    dispose() {
      this.disposed = true;
    }
    isDisposed() {
      return this.disposed;
    }
    getText() {
      if (typeof this.onGetText === "function") {
        return this.onGetText();
      }
      return null;
    }
    setText(text: any) {
      if (typeof this.onSetText === "function") {
        this.onSetText(text);
      }
      if (this.didSetText) {
        this.didSetText(text);
      }

    }
    updateText(textUpdates: any) {
      assert(Array.isArray(textUpdates));
      for (let i = textUpdates.length - 1; i >= 0; i--) {
        const textUpdate = textUpdates[i];
        console.log("update text oldEnd r:" + textUpdate.oldEnd.row + " c:" + textUpdate.oldEnd.column + " oldStart r: " + textUpdate.oldStart.row + " c:" + textUpdate.oldStart.column + " newText " + textUpdate.newText);
        if (typeof this.onUpdateText === "function") {
          this.onUpdateText(textUpdate);
        }
      }
    }
    insert(position: any, text: any) {
      console.log("buffer insert pos:" + position + " text: " + text);
      if (typeof this.onInsert === "function") {
        this.onInsert(position, text);
      }
      return [position, position, text];
    }
    delete(startPosition: any, extent: any) {
      console.log("buffer delete start pos:" + startPosition + " extent: " + extent);
      if (typeof this.onDelete === "function") {
        this.onDelete(startPosition, extent);
      }
      const endPosition = traverse(startPosition, extent);
      return [startPosition, endPosition, ''];
    }
  }
function compare(a: any, b: any) {
  if (a.row === b.row) {
    return a.column - b.column;
  }
  else {
    return a.row - b.row;
  }
}
function traverse(start: any, distance: any) {
  if (distance.row === 0) {
    return { row: start.row, column: start.column + distance.column };
  }

  else {
    return { row: start.row + distance.row, column: distance.column };
  }
}
function traversal(end: any, start: any) {
  if (end.row === start.row) {
    return { row: 0, column: end.column - start.column };
  }
  else {
    return { row: end.row - start.row, column: end.column };
  }
}
function extentForText(text: any) {
  let row = 0;
  let column = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '\n') {
      column = 0;
      row++;
    }
    else {
      column++;
    }
    index++;
  }
  return { row, column };
}
function characterIndexForPosition(text: any, target: any) {
  const position = { row: 0, column: 0 };
  let index = 0;
  while (compare(position, target) < 0 && index < text.length) {
    if (text[index] === '\n') {
      position.row++;
      position.column = 0;
    }
    else {
      position.column++;
    }
    index++;
  }
  return index;
}
