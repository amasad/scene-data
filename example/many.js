var regl = require('regl')({
  extensions: [
    'oes_standard_derivatives', 'oes_element_index_uint',
    'oes_texture_float'
  ]
})
var camera = require('regl-camera')(regl, { distance: 70, phi: 0 })
var mat4 = require('gl-mat4')
var vec3 = require('gl-vec3')
var glsl = require('glslify')

var geometry = require('../')({
  textures: {
    models: { type: 'mat4', texture: regl.texture() }
  }
})

var draw = regl({
  frag: `
    #extension GL_OES_standard_derivatives: enable
    precision highp float;
    varying vec3 vpos;
    void main () {
      vec3 dx = dFdx(vpos);
      vec3 dy = dFdy(vpos);
      vec3 N = normalize(cross(dx,dy));
      gl_FragColor = vec4(N*0.5+0.5,1);
    }
  `,
  vert: glsl`
    precision highp float;
    #pragma glslify: read_mat = require('glsl-matrix-texture')
    uniform mat4 projection, view;
    uniform sampler2D mtex;
    uniform vec2 msize;
    attribute vec3 position;
    attribute float id;
    varying vec3 vpos;
    void main () {
      mat4 model = read_mat(mtex,id,msize);
      vpos = position;
      gl_Position = projection * view * model * vec4(position,1);
    }
  `,
  uniforms: {
    mtex: regl.prop('models.texture'),
    msize: regl.prop('models.size')
  },
  attributes: {
    position: regl.prop('positions.data'),
    id: regl.prop('ids.data')
  },
  elements: regl.prop('elements.data'),
  count: regl.prop('elements.count')
})

var gaxis = [ 0.39, 0.92, 0.04 ]
var axes = [], offsets = []
new Array(100).fill(0).forEach(function (_,i) {
  var r = Math.random()*20
  var theta = Math.random()*2*Math.PI
  var phi = (Math.random()*2-1)*Math.PI/2
  offsets.push([
    Math.sin(phi)*r,
    Math.sin(theta)*r,
    Math.cos(theta)*r
  ])
  axes.push(vec3.random([]))
  geometry.add('camera'+i, {
    positions: [
      [-0.5,-0.5,-2.0],[-0.5,+0.5,-2.0],[+0.5,+0.5,-2.0],[+0.5,-0.5,-2.0], // back
      [-0.5,-0.5,+0.0],[-0.5,+0.5,+0.0],[+0.5,+0.5,+0.0],[+0.5,-0.5,+0.0], // front
      [-0.5,-0.5,-2.0],[-0.5,-0.5,+0.0],[+0.5,-0.5,+0.0],[+0.5,-0.5,-2.0], // bottom
      [-0.5,+0.5,-2.0],[-0.5,+0.5,+0.0],[+0.5,+0.5,+0.0],[+0.5,+0.5,-2.0], // top
      [-0.5,-0.5,-2.0],[-0.5,+0.5,-2.0],[-0.5,+0.5,+0.0],[-0.5,-0.5,+0.0], // right
      [+0.5,-0.5,-2.0],[+0.5,+0.5,-2.0],[+0.5,+0.5,+0.0],[+0.5,-0.5,+0.0], // left
      [-0.2,-0.2,+0.0],[-0.2,+0.2,+0.0],[-0.5,+0.5,+0.5],[-0.5,-0.5,+0.5], // right fan
      [+0.2,-0.2,+0.0],[+0.2,+0.2,+0.0],[+0.5,+0.5,+0.5],[+0.5,-0.5,+0.5], // left fan
      [-0.2,+0.2,+0.0],[+0.2,+0.2,+0.0],[+0.5,+0.5,+0.5],[-0.5,+0.5,+0.5], // top fan
      [-0.2,-0.2,+0.0],[+0.2,-0.2,+0.0],[+0.5,-0.5,+0.5],[-0.5,-0.5,+0.5]  // bottom fan
    ],
    cells: [
      [0,1,2],[0,2,3],
      [4,5,6],[4,6,7],
      [8,9,10],[8,10,11],
      [12,13,14],[12,14,15],
      [16,17,18],[16,18,19],
      [20,21,22],[20,22,23],
      [24,25,26],[24,26,27],
      [28,29,30],[28,30,31],
      [32,33,34],[32,34,35],
      [36,37,38],[36,38,39]
    ]
  })
})

geometry.pack()
update()
window.geometry = geometry

regl.frame(function () {
  regl.clear({ color: [0,0,0,1], depth: true })
  camera(function () { draw(geometry.data) })
  update()
})

function update () {
  var models = geometry.data.models
  for (var i = 0; i < models.count; i++) {
    var m = models.data.subarray(i*16,i*16+16)
    mat4.identity(m)
    mat4.rotate(m,m,performance.now()*0.0001,gaxis)
    mat4.translate(m,m,offsets[i])
    mat4.rotate(m,m,performance.now()*0.001+i,axes[i])
  }
  models.texture({
    data: models.data,
    type: 'float',
    format: 'rgba',
    width: models.size[0],
    height: models.size[1]
  })
}
