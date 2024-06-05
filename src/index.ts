import fs from 'fs';
import moment from 'moment'
import path from 'path';

const EMAILS_TO_FILTER = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/emails.json'), 'utf8'));

function parseArgs(args: any) {
  const params: {[key: string]: string} = {};

  args.forEach((arg: string) => {
      const [key, value] = arg.split('=');
      if (key && value) {
          params[key] = value;
      } else {
          console.error(`Invalid argument format: ${arg}. Expected format: field=value`);
      }
  });

  return params;
}

function validateParams(params: any) {
  const errors: string[] = [];

  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  if (!params.startDate) {
    errors.push('Missing required parameter: startDate');
  } else if (!dateRegex.test(params.startDate)) {
    errors.push('StartDate must be in the format YYYY-MM-DDTHH:MM:SS');
  }

  if (!params.endDate) {
    errors.push('Missing required parameter: endDate');
  } else if (!dateRegex.test(params.endDate)) {
    errors.push('EndDate must be in the format YYYY-MM-DDTHH:MM:SS');
  }

  if (!params.projectId) {
    errors.push('Missing required parameter: projectId');
  }

  if (!params.description) {
    errors.push('Missing required parameter: description');
  }

  if (!params.apiKey) {
    errors.push('Missing required parameter: apiKey');
  }

  if (!params.workspaceId) {
    errors.push('Missing required parameter: workspaceId');
  }

  return errors;
}

const args = process.argv.slice(2);
const params = parseArgs(args);
const validationErrors = validateParams(params);

if (validationErrors.length > 0) {
  console.log('Validation errors:');
  validationErrors.forEach(error => console.log(`- ${error}`));
  process.exit(1);
}

const API_URL = `https://api.clockify.me/api/v1/workspaces/${params.workspaceId}`;
const API_KEY = params.apiKey;
const ENTRY_PROJECT_ID = params.projectId;
const ENTRY_DESCRIPTION = params.description;
const ENTRY_START_DATE = params.startDate;
const ENTRY_END_DATE = params.endDate;

const filterUsersBasedOnEmailsFile = async () => {
  const response = await fetch(API_URL + `/users?page-size=5000`, {
    headers: {
      'x-api-key': API_KEY,
      'content-type': 'application/json',
    },
  })

  if (response && !response.ok) throw await response.text();

  const users: any = await response.json()

  const filteredUsers: any[] = []

  EMAILS_TO_FILTER.forEach((email: string) => {
    const user = users.find((user: any) => user.email === email);

    if (user) {
      filteredUsers.push(user)
    } else {
      console.log('User not found: ', email)
    }
  })

  return filteredUsers;
}

const insertTimeEntry = async (user: any) => {
  const newEntry = {
    billable: true,
    customAttributes: [],
    customFields: [],
    description: ENTRY_DESCRIPTION,
    start: moment(ENTRY_START_DATE).add(3, 'h').format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    end: moment(ENTRY_END_DATE).add(3, 'h').format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    projectId: ENTRY_PROJECT_ID,
    tagIds: [],
    taskId: null,
    type: 'REGULAR'
  }

  try {
    const response = await fetch(API_URL + `/user/${user.id}/time-entries`, {
      method: 'post',
      body: JSON.stringify(newEntry),
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
    })

    if (response) {
      if (response.ok) {
        console.log('Inserted time entry for user ' + user.email)
      } else {
        throw Error('Error on inserting time entry for user ' + user.email + ' - ' + await response.text());
      }
    } else {
      throw Error('Error on inserting time entry for user ' + user.email);
    }
  } catch (error) {
    return error
  }
}

const insertTimeEntryInParallel = async (users: any[]) => {
  const insertTimeEntryPromises: Promise<any>[] = [];

  for (const user of users) {
    insertTimeEntryPromises.push(insertTimeEntry(user));
  }

  const results = await Promise.allSettled(insertTimeEntryPromises);

  const insertTimeEntryRejectedPromiseReasons = results.filter((result: any) => result.status === 'rejected').map((result: any) => result.reason)

  if (insertTimeEntryRejectedPromiseReasons.length > 0) {
    console.log(insertTimeEntryRejectedPromiseReasons);
  }
}

const fetchProjectMemberships = async (body: string) => {
  try {
    const response = await fetch(API_URL + `/projects/${ENTRY_PROJECT_ID}/memberships`, {
      method: 'post',
      body,
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
    })

    if (response && !response.ok) {
      throw Error('Error on modify project memberships' + body + ' - ' + await response.text());
    }
  } catch (error) {
    return error
  }
}

const assignUsersToProject = async (userIds: string[]) => {
  await fetchProjectMemberships(JSON.stringify({
    remove: false,
    userIds
  }))

  console.log('assignUsersToProject done')
}

const removeUsersFromProject = async (userIds: string[]) => {
  await fetchProjectMemberships(JSON.stringify({
    remove: true,
    userIds
  }))

  console.log('removeUsersFromProject done')
}

const filterUsersAlreadyHaveTimeEntry = async (users: any[]) => {
  const promises: Promise<any>[] = [];

  const entryStartDateFormatted = moment(ENTRY_START_DATE).format('YYYY-MM-DDTHH:mm:ss') + 'Z';
  const entryEndDateFormatted = moment(ENTRY_END_DATE).format('YYYY-MM-DDTHH:mm:ss') + 'Z';

  users.forEach(user => {
    promises.push(fetch(API_URL + `/user/${user.id}/time-entries?start=${entryStartDateFormatted}&end=${entryEndDateFormatted}`, {
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
    }))
  });

  const responses = await Promise.all(promises);
  const userIdsToRemove: string[] = []

  for (const response of responses) {
    const timeEntries: any = await response.json()

    if (timeEntries.length > 0) {
      userIdsToRemove.push(timeEntries[0].userId)
      console.log(`User ${users.find((user: any) => user.id === timeEntries[0].userId)?.email} already has time entry`)
    }
  }

  return users.filter((user: any) => !userIdsToRemove.includes(user.id))
}


(async () => {
  let users: any[] = [];

  try {
    users = await filterUsersBasedOnEmailsFile();

    users = await filterUsersAlreadyHaveTimeEntry(users);

    console.log(`Inserting time entry for ${users.length} users: `)
    console.log(users.map((user: any) => user.email))

    if (users.length > 0) {
      await assignUsersToProject(users.map((user: any) => user.id));
      await insertTimeEntryInParallel(users);
    }
  } catch (error) {
    console.log(error)
  } finally {
    if (users.length > 0)
      await removeUsersFromProject(users.map((user: any) => user.id));
  }

})();