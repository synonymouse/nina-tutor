import { cp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const buildDir = join(projectRoot, 'dist-preview-build');
const previewDir = join(projectRoot, 'dist-preview');

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
      }
    });
  });
}

try {
  await rm(buildDir, { recursive: true, force: true });
  await run('npm', ['run', 'build'], {
    ...process.env,
    SITE_URL: 'https://nina-dyachenko.pages.dev',
    PUBLIC_YANDEX_METRICA_ID: '',
    ASTRO_OUT_DIR: buildDir,
  });

  await rm(previewDir, { recursive: true, force: true });
  await cp(join(buildDir, 'client'), previewDir, { recursive: true });
  await writeFile(join(previewDir, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  await writeFile(join(previewDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  await run('npx', [
    '--yes',
    'wrangler',
    'pages',
    'deploy',
    previewDir,
    '--project-name',
    'nina-dyachenko',
    '--branch',
    'master',
    '--commit-dirty=true',
  ]);

  console.log('\nPreview updated: https://nina-dyachenko.pages.dev');
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
