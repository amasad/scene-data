// this example is the slow version,
// not looking up model matrices from a texture

var regl = require('regl')({
  extensions: [
    'oes_standard_derivatives', 'oes_element_index_uint',
    'oes_texture_float'
  ]
})
var camera = require('regl-camera')(regl, { distance: 200, phi: 0 })
var mat4 = require('gl-mat4')
var vec3 = require('gl-vec3')
var model = new Float32Array(16)

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
  vert: `
    precision highp float;
    uniform mat4 projection, view, model;
    attribute vec3 position;
    varying vec3 vpos;
    void main () {
      vpos = position;
      gl_Position = projection * view * model * vec4(position,1);
    }
  `,
  uniforms: {
    model: function (context, props) {
      var i = props.id
      mat4.identity(model)
      mat4.rotate(model,model,performance.now()*0.0001,gaxis)
      mat4.translate(model,model,offsets[i])
      mat4.rotate(model,model,performance.now()*0.001+i,axes[i])
      return model
    }
  },
  attributes: {
    position: regl.prop('positions')
  },
  elements: regl.prop('cells')
})

var gaxis = [ 0.39, 0.92, 0.04 ]
var axes = [], offsets = []
for (var i = 0; i < 5000; i++) {
  var r = Math.random()*500
  var theta = Math.random()*2*Math.PI
  var phi = (Math.random()*2-1)*Math.PI/2
  offsets.push([
    Math.sin(phi)*r,
    Math.sin(theta)*r,
    Math.cos(theta)*r
  ])
  axes.push(vec3.random([]))
}
var geometry = {
  positions: [
    [-0.5,-0.5,-2.0],[-0.5,+0.5,-2.0],[+0.5,+0.5,-2.0],[+0.5,-0.5,-2.0],
    [-0.5,-0.5,+0.0],[-0.5,+0.5,+0.0],[+0.5,+0.5,+0.0],[+0.5,-0.5,+0.0],
    [-0.5,-0.5,-2.0],[-0.5,-0.5,+0.0],[+0.5,-0.5,+0.0],[+0.5,-0.5,-2.0],
    [-0.5,+0.5,-2.0],[-0.5,+0.5,+0.0],[+0.5,+0.5,+0.0],[+0.5,+0.5,-2.0],
    [-0.5,-0.5,-2.0],[-0.5,+0.5,-2.0],[-0.5,+0.5,+0.0],[-0.5,-0.5,+0.0],
    [+0.5,-0.5,-2.0],[+0.5,+0.5,-2.0],[+0.5,+0.5,+0.0],[+0.5,-0.5,+0.0],
    [-0.2,-0.2,+0.0],[-0.2,+0.2,+0.0],[-0.5,+0.5,+0.5],[-0.5,-0.5,+0.5],
    [+0.2,-0.2,+0.0],[+0.2,+0.2,+0.0],[+0.5,+0.5,+0.5],[+0.5,-0.5,+0.5],
    [-0.2,+0.2,+0.0],[+0.2,+0.2,+0.0],[+0.5,+0.5,+0.5],[-0.5,+0.5,+0.5],
    [-0.2,-0.2,+0.0],[+0.2,-0.2,+0.0],[+0.5,-0.5,+0.5],[-0.5,-0.5,+0.5]
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
}
var props = []
for (var i = 0; i < 5000; i++) {
  props.push(Object.assign({ id: i }, geometry))
}

regl.frame(function () {
  regl.clear({ color: [0,0,0,1], depth: true })
  camera(function () { draw(props) })
})

