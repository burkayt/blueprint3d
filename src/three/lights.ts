
import {DirectionalLight, HemisphereLight, Vector3} from 'three';

namespace BP3D.Three {
  export var Lights = function (scene, floorplan) {

    var scope = this;
    var scene = scene;
    var floorplan = floorplan;

    var tol = 1;
    var height = 300; // TODO: share with Blueprint.Wall

    var dirLight;

    this.getDirLight = function () {
      return dirLight;
    }

    function init() {
      var light = new HemisphereLight(0xffffff, 0x888888, 1.1);
      light.position.set(0, height, 0);
      scene.add(light);

      dirLight = new DirectionalLight(0xffffff, 0);
      dirLight.color.setHSL(1, 1, 0.1);

      dirLight.castShadow = true;

      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;

      dirLight.shadow.camera.far = height + tol;
      dirLight.shadowBias = -0.0001;
      dirLight.shadowDarkness = 0.2;
      dirLight.visible = true;
      dirLight.shadowCameraVisible = false;

      scene.add(dirLight);
      scene.add(dirLight.target);

      floorplan.fireOnUpdatedRooms(updateShadowCamera);
    }

    function updateShadowCamera() {

      var size = floorplan.getSize();
      var d = (Math.max(size.z, size.x) + tol) / 2.0;

      var center = floorplan.getCenter();
      var pos = new Vector3(
        center.x, height, center.z);
      dirLight.position.copy(pos);
      dirLight.target.position.copy(center);
      //dirLight.updateMatrix();
      //dirLight.updateWorldMatrix()
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      // this is necessary for updates
      // if (dirLight.shadowCamera) {
      //   dirLight.shadowCamera.left = dirLight.shadowCameraLeft;
      //   dirLight.shadowCamera.right = dirLight.shadowCameraRight;
      //   dirLight.shadowCamera.top = dirLight.shadowCameraTop;
      //   dirLight.shadowCamera.bottom = dirLight.shadowCameraBottom;
        dirLight.shadow.camera.updateProjectionMatrix();
      }
    // }

    init();
  }
}
