from flask_assets import Environment, Bundle
import jsmin, cssmin

def run(app):
  assets = Environment(app)

  # fontawesome: https://use.fontawesome.com/eee475fc06.js
  REACT_JS = Bundle('js/lib/fuse.min.js', 'js/lib/jquery.min.js', 'js/lib/react.min.js', 'js/lib/react-dom.min.js', 'js/lib/browser.min.js', 'js/lib/redux.min.js', output='gen/react-pack.js')
  assets.register('REACT_JS', REACT_JS)

  APP_JS = Bundle('js/components/app.jsx', output='gen/app.jsx')
  assets.register('APP_JS', APP_JS)

  APP_CSS = Bundle('css/global.css', 'css/app.css', filters='cssmin', output='gen/app.css')
  assets.register('APP_CSS', APP_CSS)