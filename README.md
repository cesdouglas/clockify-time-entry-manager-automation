# Clockify Time Entry Manager Automation

This script automates the process of inserting time entries into Clockify for a list of users based on their email addresses. It also handles user assignment to and removal from a specified project. The script is designed to be run with `ts-node`.

## Summary

-  [Prerequisites](#prerequisites)
-  [Installation](#installation)
-  [Usage](#usage)
-  [Example](#example)
-  [Parameters](#parameters)
-  [Script Overview](#script-overview)
-  [Error Handling](#error-handling)
-  [Limitations](#limitations)
-  [Dependencies](#dependencies)
-  [License](#license)
-  [Contributing](#contributing)

## Prerequisites
- Node.js v18 or higher installed on your system
- ts-node installed globally or locally (npm install -g ts-node)
- A Clockify API key
- An `emails.json` file containing the list of user emails to filter


## Installation
1. Clone the repository:

```sh
git clone https://github.com/cesdouglas/clockify-time-entry-manager-automation.git
cd clockify-time-entry-manager-automation
```

2. Install the dependencies:

```sh
npm install
```

3. Ensure you have `emails.json` file in the `assets` directory. The file should contain an array of email addresses:

```json
[
  "user1@example.com",
  "user2@example.com"
]
```

## Usage
To run the script with `ts-node`, use the following command format:

```sh
ts-node src/index.ts workspaceId='yourClockifyWorkspaceId' apiKey="yourClockifyApiKey" projectId="yourClockifyProjectId" startDate="YYYY-MM-DDTHH:MM:SS" endDate="YYYY-MM-DDTHH:MM:SS" description="Your description"
```

### Example
```sh
ts-node src/index.ts workspaceId='2f248ade29b24d859ad5a24a' apiKey="yourClockifyApiKey" projectId="672731cfd4b548158758bf30" startDate="2024-06-01T09:00:00" endDate="2024-06-01T17:00:00" description="Daily stand-up meeting"
```

## Parameters
- `workspaceId`: Your Clockify Workspace id.
- `apiKey`: Your Clockify API key.
- `projectId`: The ID of the Clockify project to which the time entry will be assigned.
- `startDate`: The start date and time for the time entry in the format YYYY-MM-DDTHH:MM:SS.
- `endDate`: The end date and time for the time entry in the format YYYY-MM-DDTHH:MM:SS.
- `description`: A description for the time entry.


## Script Overview

1. **Argument Parsing**: The script parses the command line arguments to extract the required parameters.
2. **Validation**: It validates the parameters to ensure all required fields are present and correctly formatted.
3. **Fetch Users**: It fetches the list of users from Clockify and filters them based on the emails specified in `emails.json`.
4. **Filter Users with Existing Entries**: It filters out users who already have a time entry within the specified date range.
5. **Insert Time Entries**: It inserts time entries for the filtered users.
6. **Assign/Remove Users from Project**: It assigns users to the specified project before inserting time entries and removes them afterward.

## Limitations
- The date inputs are considering the São Paulo timezone.
- The script does not consider daylight saving time

## Error Handling
- The script logs any errors encountered during the execution and exits gracefully.
- Validation errors for missing or incorrectly formatted parameters are displayed with appropriate messages.

## Dependencies
- `fs`: For reading the `emails.json` file.
- `moment`: For date and time manipulation.
- `path`: For resolving file paths.
- `node-fetch`: For making HTTP requests to the Clockify API.

## License
This project is licensed under the MIT License.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any improvements or bug fixes.