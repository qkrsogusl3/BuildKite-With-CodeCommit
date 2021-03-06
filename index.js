const AWS = require('aws-sdk')
const axios = require('axios')

const codecommit = new AWS.CodeCommit()


const handleReference = async (repositoryName, reference) => {

    const buildkiteURL = `https://api.buildkite.com/v2/organizations/${process.env.BUILDKITE_ORG}/pipelines/aws-${repositoryName.toLowerCase()}/builds`

    const { commit, ref } = reference

    const match = ref.match(/^refs\/heads\/(.*)/)
    if (!match) {
        return false
    }
    const branch = match[1]
    const { commit: { message, author } } = await codecommit.getCommit({ repositoryName, commitId: commit }).promise()

    const env = {
        "BUILD_TARGET": "Android"
    };

    const params = {
        commit,
        branch,
        message,
        author,
        env
    }

    const response = await axios.post(buildkiteURL, params, {
        headers: {
            Authorization: `Bearer ${process.env.BUILDKITE_TOKEN}`
        }
    })

    return {
        params,
        response: {
            status: response.status,
            data: response.data,
        }
    }
}

const handleRecord = async (record) => {
    const { eventSourceARN, codecommit: { references } } = record
    return await Promise.all(references.map(reference => {
        const repositoryName = eventSourceARN.split(':')[5]
        return handleReference(repositoryName, reference)
    }))
}

exports.handler = async (event) => {
    return await Promise.all(event.Records.map(handleRecord))
};
