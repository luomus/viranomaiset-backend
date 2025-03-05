import app from './app.js';

app.listen(app.get('port'), () => {
  console.log(
    'Running at http://localhost:%d',
    app.get('port')
  );
});
