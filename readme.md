# scene-data

pack geometry data into typed arrays and textures to minimize draw calls

You can think of this library as occupying the same niche that scene graphs
typically inhabit, but this library is more flexible and probably easier to
wring performance out of.

You can do "scene graph" type things with scene-data, but you're not required
to. For example, for most purposes you could store a second matrix alongside a
model matrix as a way of specifying a group transform. If you wanted something
that was completely scenegraphy you could write arbitrary code to calculate a
model matrix on the javascript side of the fence.

Unlike a scene graph, this module is meant to provide data for a single draw
call. To have a scene with many different kinds of draw calls and different
scene attributes and textures, you would create a `scene-data` instance for each
draw call.

# example

This demo packs geometry data into typed arrays to use as attributes and
elements. It also packs model matrices into a texture which is read in the
version shader using a built-in id attribute.

This demo uses [regl][], but this library is not tied to any webgl abstraction
and should be suitable with using with raw webgl or a framework.

Compare the [fast version][] (below) with the [slow version][].

[fast version]: https://substack.neocities.org/example/scene-geometry-fast.html
[slow version]: https://substack.neocities.org/example/scene-geometry-slow.html
[regl]: https://regl.party

``` js
var regl = require('regl')({
  extensions: [ 'oes_standard_derivatives',
    'oes_element_index_uint', 'oes_texture_float'
  ]
})
var camera = require('regl-camera')(regl, { distance: 200, phi: 0 })
var mat4 = require('gl-mat4')
var vec3 = require('gl-vec3')
var glsl = require('glslify')

var scene = require('scene-data')({
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
new Array(5000).fill(0).forEach(function (_,i) {
  var r = Math.random()*500
  var theta = Math.random()*2*Math.PI
  var phi = (Math.random()*2-1)*Math.PI/2
  offsets.push([
    Math.sin(phi)*r,
    Math.sin(theta)*r,
    Math.cos(theta)*r
  ])
  axes.push(vec3.random([]))
  scene.add('camera'+i, {
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
  })
})

scene.pack()
update()

regl.frame(function () {
  regl.clear({ color: [0,0,0,1], depth: true })
  camera(function () { draw(scene.data) })
  update()
})

function update () {
  var models = scene.data.models
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
```

To run this example from the example directory:

```
$ cd example
$ npm install
$ npm start
```

# api

``` js
var sceneData = require('scene-data')
```

## var scene = sceneData(opts)

Create a new scene instance from:

* `opts.textures` - map of texture names to texture fields (see below)
* `opts.attributes` - map of attribute names to string types (see below)

Texture fields are string types (see next section) or objects with a `type`
string and arbitrary additional fields that are stored along with these
built-in properties on the `scene` instance.

Attribute and texture types are these strings:

* vec2, vec3, vec4
* mat2, mat3, mat4
* int8, int16, int32
* uint8, uint16, uint32

In addition, you can specify a `[n]` after a type to set a quantity `n`.
(Not yet implemented.)

## scene.add(geometry)

Add a piece of `geometry` to the scene. This geometry should at least have
entries for the built-in types `geometry.positions` and `geometry.cells` plus
whichever custom attributes have been configured.

## scene.data

Scene data for attributes, elements, and textures are stored by name on the
`scene.data` object.

Textures have these properties:

* scene.data[textureKey].data - typed array of data
* scene.data[textureKey].type - given type string
* scene.data[textureKey].size - array of texture dimensions `[width,height]`
* scene.data[textureKey].count - number of scene objects

And attributes and elements have these properties:

* scene.data[key].data - typed array of data
* scene.data[key].type - type string
* scene.data[key].count - number of records of given type

There are 3 built-in types: positions, ids, and cells.

The id field is populated automatically starting from 0 for every piece of
geometry added to the scene using `scene.add()`. The other fields (and any other
user-defined attributes) given to add are merged into the respective
`scene.data` records.

# install

With npm do:

```
npm install scene-data
```

You should probably use this library with glslify, a module system for glsl code,
so that you can use the `read_mat()` function defined in [glsl-matrix-texture][].

[glsl-matrix-texture]: https://npmjs.com/package/glsl-matrix-texture

You can use glslify with other bundlers, but the easiest way is to use
browserify.

# license

BSD
