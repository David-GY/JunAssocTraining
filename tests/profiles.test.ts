import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as profiles from '../app/profiles.ts';
const {initialProfiles, validProfile, displayProfileLink}=profiles;

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS6sAAAAASUVORK5CYII=';

test('legacy profiles remain valid and editable media survives JSON persistence', () => {
  assert.ok(validProfile(initialProfiles[0]));
  const profile = {...initialProfiles[0], profileLink:'https://example.com/kusina', images:{avatar:png,cover:png,posts:[png,'']}};
  const saved = JSON.parse(JSON.stringify(profile));
  assert.ok(validProfile(saved));
  assert.equal(saved.profileLink, 'https://example.com/kusina');
  assert.equal(saved.images?.posts?.[0], png);
});

test('invalid optional links cannot bypass profile validation', () => {
  for (const profileLink of [42, 'javascript:alert(1)', 'a'.repeat(501), 'https://example.com/\nheader']) {
    assert.equal(validProfile({...initialProfiles[0],profileLink}),false);
  }
});

test('invalid image payloads and oversized media cannot be saved', () => {
  for (const images of [{avatar:'https://example.com/p.png'}, {cover:'data:image/svg+xml;base64,PHN2Zz4='}, {avatar:'data:image/png;base64,YmFk'}, {posts:[1]}, {posts:Array(31).fill('')}, {cover:png+'A'.repeat(200_000)}]) {
    assert.equal(validProfile({...initialProfiles[0],images}),false);
  }
});

test('editing the displayed address preserves company identity and default addresses', () => {
  const profile={...initialProfiles[0],profileLink:'https://example.com/lina'};
  assert.equal(displayProfileLink(profile),'https://example.com/lina');
  assert.equal(profile.id,'kusina-ni-lina');
  assert.equal(displayProfileLink({...profile,profileLink:''}),'social.example/kusina-ni-lina');
  assert.equal(displayProfileLink(initialProfiles[1]),'verdant-packaging.example/');
});

test('combined image payloads stay within the database record budget', () => {
  // Individually valid PNG data, but nine copies exceed the total record limit.
  const largePng='data:image/png;base64,'+btoa('\x89PNG\r\n\x1a\n'+'a'.repeat(140_000));
  assert.equal(validProfile({...initialProfiles[0],images:{cover:largePng}}),true);
  assert.equal(validProfile({...initialProfiles[0],images:{posts:Array(9).fill(largePng)}}),false);
});

test('post text and pictures stay paired after deletion, insertion, and reordering', () => {
  const serialize=profiles.serializePosts;
  const entries=[{text:'A',image:png},{text:'B',image:''},{text:'C',image:png}];
  assert.deepEqual(serialize([entries[1],entries[2]]),{posts:'B\nC',images:['',png]});
  assert.deepEqual(serialize([entries[2],{text:'New post',image:''},entries[0]]),{posts:'C\nNew post\nA',images:[png,'',png]});
  assert.deepEqual(serialize([{text:'',image:png}]),{posts:'',images:[]});
});
