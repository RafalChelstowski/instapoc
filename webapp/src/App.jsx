import './App.css'

function App() {

  const onClick = () => { console.log('click') }
  return (
    <>
      <div>
        user insta id is:
      </div>
      <div className="card">
        <button onClick={onClick}>
          send video
        </button>
      </div>
    </>
  )
}

export default App
