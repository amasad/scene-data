var getSize = require('glsl-matrix-texture')
var cons = {
  float: Float32Array,
  vec2: Float32Array, vec3: Float32Array, vec4: Float32Array,
  mat2: Float32Array, mat3: Float32Array, mat4: Float32Array,
  int8: Uint8Array, int16: Uint16Array, int32: Uint32Array,
  uint8: Uint8Array, uint16: Uint16Array, uint32: Uint32Array
}

module.exports = Geometry

function Geometry (opts) {
  var self = this
  if (!(self instanceof Geometry)) return new Geometry(opts)
  self._data = []
  self._idCount = 0
  self._createTexture = opts.createTexture
  self._names = {}
  self._ids = {}

  self.data = {
    positions: {
      data: new Float32Array(0),
      type: 'vec3',
      count: 0
    },
    ids: {
      data: new Float32Array(0),
      type: 'float',
      count: 0
    },
    elements: {
      data: new Uint32Array(0),
      type: 'uint32[3]',
      count: 0
    }
  }
  self._textureKeys = []
  Object.keys(opts.textures || {}).forEach(function (key) {
    var type = opts.textures[key]
    self._textureKeys.push(key)
    self.data[key] = {
      data: new Float32Array(0),
      type: type,
      texture: self._createTexture(),
      size: [0,0],
      update: function () {
        self.data[key].texture({
          data: self.data[key].data,
          type: 'float',
          format: 'rgba',
          width: self.data[key].size[0],
          height: self.data[key].size[1],
        })
      },
      count: 0
    }
  })
  self._attributeKeys = []
  Object.keys(opts.attributes || {}).forEach(function (key) {
    var type = opts.attributes[key]
    self._attributeKeys.push(key)
    self.data[key] = {
      type: type,
      data: new(cons[type])(0),
      count: 0
    }
  })
}

Geometry.prototype.add = function (name, mesh) {
  var posCount = getCount(mesh.positions,3)
  this.data.positions.count += posCount*3
  this.data.ids.count += posCount
  var cellCount = getCount(mesh.cells,3)
  this.data.elements.count += cellCount*3
  var id = this._idCount++
  this._names[id] = name
  this._ids[name] = id
  for (var i = 0; i < this._textureKeys.length; i++) {
    var key = this._textureKeys[i]
    this.data[key].count++
  }
  this._data.push({
    name: name,
    mesh: mesh,
    id: id,
    positionRange: [
      this.data.positions.count - posCount*3,
      this.data.positions.count
    ],
    cellRange: [
      this.data.elements.count - cellCount*3,
      this.data.elements.count
    ]
  })
}

Geometry.prototype.pack = function () {
  this.data.positions.data = new Float32Array(this.data.positions.count)
  this.data.ids.data = new Float32Array(this.data.ids.count)
  this.data.elements.data = new Uint32Array(this.data.elements.count)

  for (var i = 0; i < this._textureKeys.length; i++) {
    var key = this._textureKeys[i]
    var msize = getSize(this.data[key].count)
    this.data[key].size[0] = msize.width
    this.data[key].size[1] = msize.height
    this.data[key].data = new(cons[this.data[key].type])(msize.length)
    this.data[key].update()
  }
  for (var i = 0; i < this._data.length; i++) {
    var d = this._data[i]
    var pr = d.positionRange
    var cr = d.cellRange
    this.data.ids.data.subarray(pr[0],pr[1]).fill(d.id)
    if (isFlat(d.mesh.positions)) {
      this.data.positions.data.set(d.mesh.positions,pr[0])
    } else {
      var l = d.mesh.positions.length
      for (var j = 0; j < l; j++) {
        var p = d.mesh.positions[j]
        this.data.positions.data[pr[0]+j*3+0] = p[0]
        this.data.positions.data[pr[0]+j*3+1] = p[1]
        this.data.positions.data[pr[0]+j*3+2] = p[2]
      }
    }
    for (var j = 0; j < this._attributeKeys.length; j++) {
      var key = this._attributeKeys[j]
      this.data[key].data = new Float32Array(this.data.positions.count)
      this.data[key].count = this.data.positions.count
      if (isFlat(d.mesh[key])) {
        this.data[key].data.set(d.mesh[key],pr[0])
      } else {
        var l = d.mesh[key].length
        for (var k = 0; k < l; k++) {
          var p = d.mesh[key][j]
          this.data[key].data[pr[0]+k*3+0] = p[0]
          this.data[key].data[pr[0]+k*3+1] = p[1]
          this.data[key].data[pr[0]+k*3+2] = p[2]
        }
      }
    }
    if (isFlat(d.mesh.cells)) {
      this.data.elements.data.set(d.mesh.cells,cr[0])
    } else {
      var l = d.mesh.cells.length
      for (var j = 0; j < l; j++) {
        var c = d.mesh.cells[j]
        this.data.elements.data[cr[0]+j*3+0] = c[0] + pr[0]/3
        this.data.elements.data[cr[0]+j*3+1] = c[1] + pr[0]/3
        this.data.elements.data[cr[0]+j*3+2] = c[2] + pr[0]/3
      }
    }
  }
  this._data = []
}

Geometry.prototype.getId = function (name) {
  var id = this._ids[name]
  return id === undefined ? -1 : id
}

Geometry.prototype.getName = function (id) {
  return this._names[id]
}

function getCount (data, size) {
  return isFlat(data) ? data.length / size : data.length
}

function isFlat (x) { return !Array.isArray(x[0]) }
