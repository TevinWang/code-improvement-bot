import { Button, Dropdown } from 'flowbite-react';
import './App.css';
import logo from './drcode.png'
import { useState, useEffect } from 'react';
import { initialState } from './index.js'
import axios from 'axios';
const onSignIn = () => {

}

const onSuccess = response => console.log(response);
const onFailure = response => console.error(response);

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [repos, setRepos] = useState([{ full_name: 'TevinWang/repo1' }, { full_name: 'TevinWang/repo2' }])
  const [repo, setRepo] = useState('Select a public Github repo')
  const { client_id, client_secret, redirect_uri } = initialState
  useEffect(() => {
    // After requesting Github access, Github redirects back to your app with a code parameter
    const url = window.location.href;
    const hasCode = url.includes("?code=");

    // If Github API returns the code parameter
    if (hasCode) {
      const newUrl = url.split("?code=");
      console.log(newUrl[1])
      window.history.pushState({}, null, newUrl[0]);

      async function fetch() {
        const response = await axios.post('https://drcode-c2c0979f214d.herokuapp.com/auth/github/access_token', { code: newUrl[1] });
        const accessToken = response.data.access_token;
        const userResponse = await axios.get('https://drcode-c2c0979f214d.herokuapp.com/api/github/repos', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },

        });
        const repos = userResponse.data
        setRepos(repos)
        setLoggedIn(true)
      }

      fetch()


      // Extract the access token from the response

      const requestData = {
        code: newUrl[1]
      };
    }
  })
  return (
    <>
      <div className="flex flex-col items-center justify-center sm:w-3/4 h-screen ml-auto mr-auto text-center space-y-5">
        <img className="sm:w-1/4" src={logo} alt='logo'></img>
        <h1 className="text-2xl font-bold">Clean up and improve your code with quick automation.</h1>
        {loggedIn ? (
          <>
            <div className="flex flex-row space-x-2">

            <Dropdown
              label={repo}
              className='bg-yellow'
            >
              {repos.map((repo) => {
                return (
                  <Dropdown.Item onClick={e => (setRepo(repo.full_name))}>
                    {repo.full_name}
                  </Dropdown.Item>
                )
              })}
            </Dropdown>
            <button onClick={e =>  axios.get(`https://drcode-server.vercel.app/setrepo/${repo.replace('/', '%')}`)} type="button" className="text-white bg-[#24292F] hover:bg-[#24292F]/90 focus:ring-4 focus:outline-none focus:ring-[#24292F]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-gray-500 dark:hover:bg-[#050708]/30 mr-2 mb-2">
            Submit
            </button>
            </div>
            
          </>

        ) :
          (
            <button onClick={e => { window.location.href = `https://github.com/login/oauth/authorize?scope=user&client_id=${client_id}&redirect_uri=${redirect_uri}` }} type="button" className="text-white bg-[#24292F] hover:bg-[#24292F]/90 focus:ring-4 focus:outline-none focus:ring-[#24292F]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-gray-500 dark:hover:bg-[#050708]/30 mr-2 mb-2">
              <svg class="w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clip-rule="evenodd" />
              </svg>
              Sign in with Github
            </button>

          )}
      </div>

    </>
  )
}

export default App;
