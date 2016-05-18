# Stylus Flatten Loader for Webpack

## Usage

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

This module replaces all imports in a stylus file with the import file's contents to webpack, updates dependencies and caches the contents.   
  
It returns the flattened file with all import statements replaced by the import's contents inline correctly indented.

### Simple API

In project `package.json` add this devDependency 
not hosted on npm, as I doubt anyone will want to use this.

```json
"devDependencies": {
  "stylus-flatten-loader": "git+http://github.com/ConnectedVentures/stylus-flatten-loader.git"
}
```

#### Recommended loader config
```
{ test: /\.(styl|stylus)(\?.*)?$/,
  loader: 'style-loader!css-loader!multi-stylus-render!stylus-flatten'
}
```

## License

MIT (http://www.opensource.org/licenses/mit-license.php)
