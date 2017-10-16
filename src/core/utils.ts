/** Collection of utility functions. */
import {Point} from '../model/point';

export class Utils {

  /** Determines the distance of a point from a line.
   * @param x Point's x coordinate.
   * @param y Point's y coordinate.
   * @param x1 Line-Point 1's x coordinate.
   * @param y1 Line-Point 1's y coordinate.
   * @param x2 Line-Point 2's x coordinate.
   * @param y2 Line-Point 2's y coordinate.
   * @returns The distance.
   */
  public static pointDistanceFromLine(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    let tPoint = Utils.closestPointOnLine(x, y, x1, y1, x2, y2);
    let tDx = x - tPoint.x;
    let tDy = y - tPoint.y;
    return Math.sqrt(tDx * tDx + tDy * tDy);
  }

  /** Gets the projection of a point onto a line.
   * @param x Point's x coordinate.
   * @param y Point's y coordinate.
   * @param x1 Line-Point 1's x coordinate.
   * @param y1 Line-Point 1's y coordinate.
   * @param x2 Line-Point 2's x coordinate.
   * @param y2 Line-Point 2's y coordinate.
   * @returns The point.
   */
  static closestPointOnLine(x: number, y: number, x1: number, y1: number, x2: number, y2: number): { x: number, y: number } {
    // Inspired by: http://stackoverflow.com/a/6853926
    let tA = x - x1;
    let tB = y - y1;
    let tC = x2 - x1;
    let tD = y2 - y1;

    let tDot = tA * tC + tB * tD;
    let tLenSq = tC * tC + tD * tD;
    let tParam = tDot / tLenSq;

    let tXx;
    let tYy;


    if (tParam < 0 || (x1 === x2 && y1 === y2)) {
      tXx = x1;
      tYy = y1;
    }
    else if (tParam > 1) {
      tXx = x2;
      tYy = y2;
    }
    else {
      tXx = x1 + tParam * tC;
      tYy = y1 + tParam * tD;
    }

    return {
      x: tXx,
      y: tYy
    }
  }

  /** Gets the distance of two points.
   * @param x1 X part of first point.
   * @param y1 Y part of first point.
   * @param x2 X part of second point.
   * @param y2 Y part of second point.
   * @returns The distance.
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(
      Math.pow(x2 - x1, 2) +
      Math.pow(y2 - y1, 2));
  }

  /**  Gets the angle between 0,0 -> x1,y1 and 0,0 -> x2,y2 (-pi to pi)
   * @returns The angle.
   */
  static angle(x1: number, y1: number, x2: number, y2: number): number {
    let tDot = x1 * x2 + y1 * y2;
    let tDet = x1 * y2 - y1 * x2;
    let tAngle = -Math.atan2(tDet, tDot);
    return tAngle;
  }

  /** shifts angle to be 0 to 2pi */
  static angle2pi(x1: number, y1: number, x2: number, y2: number) {
    let tTheta = Utils.angle(x1, y1, x2, y2);
    if (tTheta < 0) {
      tTheta += 2 * Math.PI;
    }
    return tTheta;
  }

  /** Checks if an array of points is clockwise.
   * @param points Is array of points with x,y attributes
   * @returns True if clockwise.
   */
  static isClockwise(points: Point[]): boolean {
    // make positive
    let tSubX = Math.min(0, Math.min.apply(null, Utils.map(points, function (p: Point) {
      return p.x;
    })));
    let tSubY = Math.min(0, Math.min.apply(null, Utils.map(points, function (p: Point) {
      return p.x;
    })));

    let tNewPoints = Utils.map(points, function (p: Point) {
      return new Point(p.x - tSubX, p.y - tSubY)
    });

    // determine CW/CCW, based on:
    // http://stackoverflow.com/questions/1165647
    let tSum = 0;
    for (let tI = 0; tI < tNewPoints.length; tI++) {
      let tC1: Point = tNewPoints[tI];
      let tC2: Point;
      if (tI === tNewPoints.length - 1) {
        tC2 = tNewPoints[0];
      }
      else {
        tC2 = tNewPoints[tI + 1];
      }
      tSum += (tC2.x - tC1.x) * (tC2.y + tC1.y);
    }
    return (tSum >= 0);
  }

  /** Creates a Guid.
   * @returns A new Guid.
   */
  static guid(): /* () => */ string {
    let tS4 = function () {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return tS4() + tS4() + '-' + tS4() + '-' + tS4() + '-' +
      tS4() + '-' + tS4() + tS4() + tS4();
  }

  /** both arguments are arrays of corners with x,y attributes */
  static polygonPolygonIntersect(firstCorners: Point[], secondCorners: Point[]): boolean {
    for (let tI = 0; tI < firstCorners.length; tI++) {
      let tFirstCorner = firstCorners[tI];
      let tSecondCorner;

      if (tI === firstCorners.length - 1) {
        tSecondCorner = firstCorners[0];
      }
      else {
        tSecondCorner = firstCorners[tI + 1];
      }

      if (Utils.linePolygonIntersect(
          tFirstCorner.x, tFirstCorner.y,
          tSecondCorner.x, tSecondCorner.y,
          secondCorners)) {
        return true;
      }
    }
    return false;
  }

  /** Corners is an array of points with x,y attributes */
  static linePolygonIntersect(x1: number, y1: number, x2: number, y2: number, corners: Point[]): boolean {
    for (let tI = 0; tI < corners.length; tI++) {
      let tFirstCorner = corners[tI];
      let tSecondCorner;
      if (tI === corners.length - 1) {
        tSecondCorner = corners[0];
      }
      else {
        tSecondCorner = corners[tI + 1];
      }

      if (Utils.lineLineIntersect(x1, y1, x2, y2, tFirstCorner.x, tFirstCorner.y, tSecondCorner.x, tSecondCorner.y)) {
        return true;
      }
    }
    return false;
  }

  /** */
  static lineLineIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    function tCCW(p1: Point, p2: Point, p3: Point) {
      let tA = p1.x;
      let tB = p1.y;
      let tC = p2.x;
      let tD = p2.y;
      let tE = p3.x;
      let tF = p3.y;
      return (tF - tB) * (tC - tA) > (tD - tB) * (tE - tA);
    }

    let tP1 = {x: x1, y: y1};
    let tP2 = {x: x2, y: y2};
    let tP3 = {x: x3, y: y3};
    let tP4 = {x: x4, y: y4};
    return (tCCW(tP1, tP3, tP4) !== tCCW(tP2, tP3, tP4)) && (tCCW(tP1, tP2, tP3) !== tCCW(tP1, tP2, tP4));
  }

  /**
   * @param x
   * @param y
   * @param corners Is an array of points with x,y attributes
   * @param startX X start coord for raycast
   * @param startY Y start coord for raycast
   */
  static pointInPolygon(x: number, y: number, corners: Point[], startX?: number, startY?: number): boolean {
    startX = startX || 0;
    startY = startY || 0;

    // ensure that point(startX, startY) is outside the polygon consists of corners
    let tMinX = 0;
    let tMinY = 0;

    if (startX === undefined || startY === undefined) {
      for (let tI = 0; tI < corners.length; tI++) {
        tMinX = Math.min(tMinX, corners[tI].x);
        tMinY = Math.min(tMinX, corners[tI].y);
      }
      startX = tMinX - 10;
      startY = tMinY - 10;
    }

    let tIntersects = 0;
    for (let tI = 0; tI < corners.length; tI++) {
      let tFirstCorner = corners[tI];
      let tSecondCorner;
      if (tI === corners.length - 1) {
        tSecondCorner = corners[0];
      }
      else {
        tSecondCorner = corners[tI + 1];
      }

      if (Utils.lineLineIntersect(startX, startY, x, y,
          tFirstCorner.x, tFirstCorner.y,
          tSecondCorner.x, tSecondCorner.y)) {
        tIntersects++;
      }
    }
    // odd intersections means the point is in the polygon
    return ((tIntersects % 2) === 1);
  }

  /** Checks if all corners of insideCorners are inside the polygon described by outsideCorners */
  static polygonInsidePolygon(insideCorners: Point[], outsideCorners: Point[], startX: number, startY: number): boolean {
    startX = startX || 0;
    startY = startY || 0;

    for (let tI = 0; tI < insideCorners.length; tI++) {
      if (!Utils.pointInPolygon(
          insideCorners[tI].x, insideCorners[tI].y,
          outsideCorners,
          startX, startY)) {
        return false;
      }
    }
    return true;
  }

  /** Checks if any corners of firstCorners is inside the polygon described by secondCorners */
  static polygonOutsidePolygon(insideCorners: Point[], outsideCorners: Point[], startX: number, startY: number): boolean {
    startX = startX || 0;
    startY = startY || 0;

    for (let tI = 0; tI < insideCorners.length; tI++) {
      if (Utils.pointInPolygon(
          insideCorners[tI].x, insideCorners[tI].y,
          outsideCorners,
          startX, startY)) {
        return false;
      }
    }
    return true;
  }

  // arrays

  static forEach(array: any[], action: any) {
    for (let tI = 0; tI < array.length; tI++) {
      action(array[tI]);
    }
  }

  static forEachIndexed(array: any[], action: any) {
    for (let tI = 0; tI < array.length; tI++) {
      action(tI, array[tI]);
    }
  }

  static map(array: any[], func: any) {
    let tResult: any[] = [];
    array.forEach((element) => {
      tResult.push(func(element));
    });
    return tResult;
  }

  /** Remove elements in array if func(element) returns true */
  static removeIf(array: any[], func: any) {
    let tResult: any[] = [];
    array.forEach((element) => {
      if (!func(element)) {
        tResult.push(element);
      }
    });
    return tResult;
  }

  /** Shift the items in an array by shift (positive integer) */
  static cycle(arr: any[], shift: number) {
    let tReturn = arr.slice(0);
    for (let tI = 0; tI < shift; tI++) {
      let tmp = tReturn.shift();
      tReturn.push(tmp);
    }
    return tReturn;
  }

  /** Returns in the unique elemnts in arr */
  static unique(arr: any[], hashFunc: any) {
    let tResults = [];
    let tMap: any = {};
    for (let tI = 0; tI < arr.length; tI++) {
      if (!tMap.hasOwnProperty(arr[tI])) {
        tResults.push(arr[tI]);
        tMap[hashFunc(arr[tI])] = true;
      }
    }
    return tResults;
  }

  /** Remove value from array, if it is present */
  static removeValue(array: any[], value: any) {
    for (let tI = array.length - 1; tI >= 0; tI--) {
      if (array[tI] === value) {
        array.splice(tI, 1);
      }
    }
  }

  /** Checks if value is in array */
  static hasValue = function (array: any[], value: any): boolean {
    for (let tI = 0; tI < array.length; tI++) {
      if (array[tI] === value) {
        return true;
      }
    }
    return false;
  }

  /** Subtracts the elements in subArray from array */
  static subtract(array: any[], subArray: any[]) {
    return Utils.removeIf(array, function (el: any) {
      return Utils.hasValue(subArray, el);
    });
  }
}

