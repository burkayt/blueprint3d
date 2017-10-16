/** Dimensioning in Inch. */
import {configDimUnit, Configuration} from './configuration';

export const dimInch: string = "inch";

/** Dimensioning in Meter. */
export const dimMeter: string = "m";

/** Dimensioning in Centi Meter. */
export const dimCentiMeter: string = "cm";

/** Dimensioning in Milli Meter. */
export const dimMilliMeter: string = "mm";

/** Dimensioning functions. */
export class Dimensioning {
  /** Converts cm to dimensioning string.
   * @param cm Centi meter value to be converted.
   * @returns String representation.
   */
  public static cmToMeasure(cm: number): string {
    switch (Configuration.getStringValue(configDimUnit)) {
      case dimInch:
        let realFeet = ((cm * 0.393700) / 12);
        let feet = Math.floor(realFeet);
        let inches = Math.round((realFeet - feet) * 12);
        return feet + "'" + inches + '"';
      case dimMilliMeter:
        return "" + Math.round(10 * cm) + " mm";
      case dimCentiMeter:
        return "" + Math.round(10 * cm) / 10 + " cm";
      case dimMeter:
      default:
        return "" + Math.round(10 * cm) / 1000 + " m";
    }
  }
}
