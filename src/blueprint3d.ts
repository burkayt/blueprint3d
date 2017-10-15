// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
namespace BP3D {
  /** Startup options. */
  export interface Options {
    /** */
    widget?: boolean;

    /** */
    threeElement?: string;

    /** */
    threeCanvasElement? : string;

    /** */
    floorplannerElement?: string;

    /** The texture directory. */
    textureDir?: string;
  }

  /** Blueprint3D core application. */
  export class Blueprint3d {

    private model: Model.Model;

    private three: any; // Three.Main;

    private floorplanner: Floorplanner.Floorplanner;

    /** Creates an instance.
     * @param options The initialization options.
     */
    constructor(options: Options) {
      this.model = new Model.Model(options.textureDir as string);
      this.three = new Three.Main(this.model, options.threeElement, options.threeCanvasElement, {});

      if (!options.widget) {
        this.floorplanner = new Floorplanner.Floorplanner(options.floorplannerElement as string, this.model.floorplan);
      }
      else {
        this.three.getController().enabled = false;
      }
    }
  }
}
