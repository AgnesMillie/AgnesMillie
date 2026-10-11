// node --test ".github/scripts/**/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './args.mjs';

test('login e saída posicionais', () => {
  // Regressão: sem --fixture, o filtro descartava o índice 0 e o login
  // virava o caminho de saída (o workflow pedia o usuário "profile/x.svg").
  assert.deepEqual(parseArgs(['AgnesMillie', 'profile/x.svg'], 'profile/padrao.svg'), {
    login: 'AgnesMillie',
    out: 'profile/x.svg',
    placeholder: false,
    fixture: null,
  });
});

test('saída tem valor padrão', () => {
  assert.equal(parseArgs(['AgnesMillie'], 'profile/padrao.svg').out, 'profile/padrao.svg');
});

test('--placeholder não consome posicional', () => {
  const args = parseArgs(['AgnesMillie', '--placeholder', 'profile/x.svg'], 'profile/padrao.svg');
  assert.equal(args.login, 'AgnesMillie');
  assert.equal(args.out, 'profile/x.svg');
  assert.equal(args.placeholder, true);
});

test('--fixture consome só o próprio valor', () => {
  const args = parseArgs(['AgnesMillie', 'profile/x.svg', '--fixture', 'dados.json'], 'profile/padrao.svg');
  assert.equal(args.login, 'AgnesMillie');
  assert.equal(args.out, 'profile/x.svg');
  assert.equal(args.fixture, 'dados.json');
});

test('--fixture sem valor é erro', () => {
  assert.throws(() => parseArgs(['AgnesMillie', '--fixture'], 'profile/padrao.svg'), /--fixture exige/);
});

test('sem login é erro', () => {
  assert.throws(() => parseArgs(['--placeholder'], 'profile/padrao.svg'), /uso:/);
});
