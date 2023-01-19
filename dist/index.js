const core = require('@actions/core')
const github = require('@actions/github')
const { jirafyChangelog } = require('./utils/changelog')

var headRef = core.getInput('head-ref')
var baseRef = core.getInput('base-ref')
const githubToken = core.getInput('githubToken')
const octokit = new github.getOctokit(githubToken)
const { owner, repo } = github.context.repo
const gitRefRegexp = /^[.A-Za-z0-9_\-\/]+$/

async function run() {
  try {
    if (!headRef) {
      headRef = github.context.sha
    }

    if (!baseRef) {
      const latestRelease = await octokit.rest.repos.getLatestRelease({
        owner: owner,
        repo: repo,
      })

      if (latestRelease) {
        baseRef = latestRelease.data.tag_name
      } else {
        core.setFailed(`There are no releases on ${owner}/${repo}. Tags are not releases.`)
      }
    }

    if (!!headRef && !!baseRef && gitRefRegexp.test(headRef) && gitRefRegexp.test(baseRef)) {
      let resp

      try {
        resp = await octokit.rest.repos.generateReleaseNotes({
          owner: owner,
          repo: repo,
          tag_name: headRef,
          previous_tag_name: baseRef
        })

      } catch (err) {
        core.setFailed(`Could not generate changelog between references because: ${err.message}`)
        process.exit(1)
      }

      const baseChangelog = resp.data.body
      console.log(
        '\x1b[32m%s\x1b[0m',
        `Base changelog between ${baseRef} and ${headRef}:\n${baseChangelog}\n`,
      )

      const jirafiedChangelog = jirafyChangelog(baseChangelog)
      console.log(
        '\x1b[32m%s\x1b[0m',
        `Jirafied Changelog:\n${jirafiedChangelog}\n`,
      )

      core.setOutput('changelog', jirafiedChangelog)

    } else {
      core.setFailed('Git ref names must contain one or more numbers, strings, underscores, periods, slashes and dashes.')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

try {
  run()
} catch (error) {
  core.setFailed(error.message)
}