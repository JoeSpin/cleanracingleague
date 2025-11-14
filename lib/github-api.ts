// GitHub API helper for file management
export async function commitFileToGitHub(
  filePath: string,
  content: string,
  commitMessage: string
) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'your-username';
  const repo = process.env.GITHUB_REPO || 'cleanracingleague';
  
  if (!token) {
    throw new Error('GitHub token not configured');
  }

  // Get current file SHA (needed for updates)
  let sha: string | undefined;
  try {
    const currentFile = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    if (currentFile.ok) {
      const data = await currentFile.json();
      sha = data.sha;
    }
  } catch (error) {
    // File doesn't exist yet, that's okay
  }

  // Commit the file
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        ...(sha && { sha })
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message}`);
  }

  return await response.json();
}

export async function deleteFileFromGitHub(
  filePath: string,
  commitMessage: string
) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'your-username';
  const repo = process.env.GITHUB_REPO || 'cleanracingleague';
  
  if (!token) {
    throw new Error('GitHub token not configured');
  }

  // Get current file SHA (required for deletion)
  const currentFile = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: { Authorization: `token ${token}` }
    }
  );

  if (!currentFile.ok) {
    throw new Error('File not found');
  }

  const data = await currentFile.json();

  // Delete the file
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        sha: data.sha
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message}`);
  }

  return await response.json();
}