import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three'
import Scene from '../model/scene'

function Skybox(scene: Scene) {
  let topColor = 0xffffff // 0xD8ECF9
  let bottomColor = 0xe9e9e9 // 0xf9f9f9;//0x565e63
  let verticalOffset = 500
  let sphereRadius = 4000
  let widthSegments = 32
  let heightSegments = 15

  let vertexShader = [
    'varying vec3 vWorldPosition;',
    'void main() {',
    '  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
    '  vWorldPosition = worldPosition.xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n')

  let fragmentShader = [
    'uniform vec3 topColor;',
    'uniform vec3 bottomColor;',
    'uniform float offset;',
    'varying vec3 vWorldPosition;',
    'void main() {',
    '  float h = normalize( vWorldPosition + offset ).y;',
    '  gl_FragColor = vec4( mix( bottomColor, topColor, (h + 1.0) / 2.0), 1.0 );',
    '}'
  ].join('\n')

  function init() {
    let uniforms = {
      topColor: {
        type: 'c',
        value: new Color(topColor)
      },
      bottomColor: {
        type: 'c',
        value: new Color(bottomColor)
      },
      offset: {
        type: 'f',
        value: verticalOffset
      }
    }

    let skyGeo = new SphereGeometry(sphereRadius, widthSegments, heightSegments)
    let skyMat = new ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: BackSide
    })

    let sky = new Mesh(skyGeo, skyMat)
    scene.add(sky)
  }

  init()
}

export default Skybox
