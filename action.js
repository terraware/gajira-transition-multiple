const { countReset } = require('console')
const _ = require('lodash')
const Jira = require('./common/net/Jira')
const core = require('@actions/core')
const fs = require('fs');

module.exports = class {
  constructor ({ githubEvent, argv, config }) {
    this.Jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    })

    this.config = config
    this.argv = argv
    this.githubEvent = githubEvent
  }

  async execute () {
    const { argv } = this

    console.log('Parsing file now')
    const issueListPath = `${process.env.GITHUB_WORKSPACE}/${argv.issueList}`
    const fileContents = fs.readFileSync(issueListPath, 'utf-8')
    const arr = fileContents.split(/\r?\n/)

    console.log(`Read array of issues: ${arr}`)

    for(const issueId of arr){

      if(!(/[A-Z][A-Z]+-[0-9]+/.test(issueId))){
        continue
      }
      const { transitions } = await this.Jira.getIssueTransitions(issueId)

      const transitionToApply = _.find(transitions, (t) => {
        if (t.id === argv.transitionId) return true
        if (t.name.toLowerCase() === argv.transition.toLowerCase()) return true
      })

      if (!transitionToApply) {
        console.log('Please specify transition name or transition id.')
        console.log('Possible transitions:')
        transitions.forEach((t) => {
          console.log(`{ id: ${t.id}, name: ${t.name} } transitions issue to '${t.to.name}' status.`)
        })

        continue
      }

      console.log(`Selected transition:${JSON.stringify(transitionToApply, null, 4)}`)

      await this.Jira.transitionIssue(issueId, {
        transition: {
          id: transitionToApply.id,
        },
      })

      const transitionedIssue = await this.Jira.getIssue(issueId)

      // console.log(`transitionedIssue:${JSON.stringify(transitionedIssue, null, 4)}`)
      console.log(`Changed ${issueId} status to : ${_.get(transitionedIssue, 'fields.status.name')} .`)
      console.log(`Link to issue: ${this.config.baseUrl}/browse/${issueId}`)
    }

    return {}
  }
}
