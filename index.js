var getSize = require('glsl-matrix-texture')

module.exports = Groups

function Groups (opts) {
  if (!(this instanceof Groups)) return new Groups(opts)
  var size = opts.size || {}
  this._vertexSize = (size.positions || 4096*3)/3
  this._elementSize = (size.cells || 4096*3)/3
  this._modelSize = size.models || 64
  var msize = getSize(this._modelSize)
  this.data = {
    positions: new Float32Array(this._vertexSize*3),
    cells: new Uint32Array(this._elementSize*3),
    ids: new Float32Array(this._vertexSize),
    models: new Float32Array(msize.length),
    modelSize: [msize.width,msize.height],
    modelTexture: null,
    count: 0
  }
  this._mfns = []
  this._updateTexture = opts.texture()
  this._voffsets = { _last: 0 }
  this._eoffsets = { _last: 0 }
  this._ids = { _last: -1 }
  this._lengths = { positions: 0, cells: 0 }
}

Groups.prototype.getId = function (name) {
  var id = this._ids[name]
  return id === undefined ? -1 : id
}

Groups.prototype.update = function () {
  for (var i = 0; i < this._mfns.length; i++) {
    var m = this.data.models.subarray(i*16,i*16+16)
    this._mfns[i](m)
  }
  this.data.modelTexture = this._updateTexture({
    data: this.data.models,
    width: this.data.modelSize[0],
    height: this.data.modelSize[1],
    format: 'rgba',
    wrapS: 'clamp',
    wrapT: 'clamp'
  })
}

Groups.prototype.add = function (name, mesh) {
  var positions = f32(mesh.positions)
  var cells = u32(mesh.cells)
  var id = ++this._ids._last
  this._ids[name] = id
  if (id*16 >= this.data.models.length) {
    this._resizeModels(this._modelSize*2)
  }
  this._mfns[id] = mesh.model

  var freeVert = this.data.positions.length - this._lengths.positions
  if (positions.length > freeVert) {
    this._resizeVertex(this._vertexSize*2)
  }
  var freeCells = this.data.cells.length - this._lengths.cells
  if (cells.length > freeCells) {
    this._resizeElements(this._elementSize*2)
  }
  for (var i = 0; i < cells.length; i++) {
    this.data.cells[i+this._eoffsets._last] = cells[i]
      + this._voffsets._last
  }
  this._eoffsets._last += cells.length
  for (var i = 0; i < positions.length; i++) {
    this.data.positions[i+this._voffsets._last*3] = positions[i]
  }
  for (var i = 0; i < positions.length/3; i++) {
    this.data.ids[i+this._voffsets._last] = id
  }
  this.data.count += cells.length
  this._lengths.cells += cells.length
  this._lengths.positions += positions.length
  this._voffsets[name] = this._voffsets._last
  this._voffsets._last += positions.length/3
}

Groups.prototype.pack = function () {
  this._resizeModels(this._ids._last+1)
  this._resizeVertex(this._lengths.positions/3)
  this._resizeElements(this._lengths.cells/3)
}

Groups.prototype._resizeModels = function (newSize) {
  var msize = getSize(newSize)
  this._modelSize = newSize
  this.data.models = new Float32Array(msize.length)
  this.data.modelSize = [msize.width,msize.height]
}

Groups.prototype._resizeVertex = function (newSize) {
  var oldPositions = this.data.positions
  var oldIds = this.data.ids
  this.data.positions = new Float32Array(newSize*3)
  this.data.ids = new Float32Array(newSize)
  for (var i = 0; i < this._vertexSize; i++) {
    this.data.positions[i*3+0] = oldPositions[i*3+0]
    this.data.positions[i*3+1] = oldPositions[i*3+1]
    this.data.positions[i*3+2] = oldPositions[i*3+2]
    this.data.ids[i] = oldIds[i]
  }
  this._vertexSize = newSize
}

Groups.prototype._resizeElements = function (newSize) {
  var oldCells = this.data.cells
  this.data.cells = new Uint32Array(newSize*3)
  for (var i = 0; i < this._elementSize; i++) {
    this.data.cells[i*3+0] = oldCells[i*3+0]
    this.data.cells[i*3+1] = oldCells[i*3+1]
    this.data.cells[i*3+2] = oldCells[i*3+2]
  }
  this._elementSize = newSize
}

function istarray (x) {
  return typeof x.subarray === 'function'
}

function f32 (x) {
  if (istarray(x)) return x
  var isFlat = Array.isArray(x[0]) ? false : true
  if (isFlat) return Float32Array.from(x)
  var dim = x[0].length
  var out = new Float32Array(x.length * dim)
  var index = 0
  for (var i = 0; i < x.length; i++) {
    for (var j = 0; j < x[i].length; j++) {
      out[index++] = x[i][j]
    }
  }
  return out
}

function u32 (x) {
  if (istarray(x)) return x
  var isFlat = Array.isArray(x[0]) ? false : true
  if (isFlat) return Uint32Array.from(x)
  var dim = x[0].length
  var out = new Uint32Array(x.length * dim)
  var index = 0
  for (var i = 0; i < x.length; i++) {
    for (var j = 0; j < x[i].length; j++) {
      out[index++] = x[i][j]
    }
  }
  return out
}
