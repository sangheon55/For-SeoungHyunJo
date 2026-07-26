import React, { useState } from 'react'
import PeopleGallery from '../components/PeopleGallery.jsx'
import HobbyList from '../components/HobbyList.jsx'

export default function Rest() {
  const [tab, setTab] = useState('people')

  return (
    <div>
      <div className="page-title">쉼 ☕</div>

      <div className="tab-bar">
        <button
          className={tab === 'people' ? 'active' : ''}
          onClick={() => setTab('people')}
        >🧡 내 사람들</button>
        <button
          className={tab === 'hobbies' ? 'active' : ''}
          onClick={() => setTab('hobbies')}
        >🎨 취미</button>
      </div>

      {tab === 'people' ? <PeopleGallery /> : <HobbyList />}
    </div>
  )
}
