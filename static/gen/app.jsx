function counter(state = 0, action) {
  switch (action.type) {
  case 'INCREMENT':
    return state + 1
  case 'DECREMENT':
    return state - 1
  default:
    return state
  }
}

var store = Redux.createStore(counter);

var appRoot;

var testingOption = $('#page-content').data('testing-option');

console.log('Version ' + testingOption);

/*
TODO: fix tabbing by explicitly allowing tab index :)
*/

var TopBar = React.createClass({
  selectPage: function(option) {
    $(this.refs.topBar).find('.TopBar-Button').removeClass('selected');
    if (option == 'myNotes') {
      $(this.refs.bar).css({
        transform: 'translateX(0)'
      });
      $(this.refs.myNotes).addClass('selected');
    } else if (option == 'myClasses') {
      $(this.refs.bar).css({
        transform: 'translateX(100%)'
      });
      $(this.refs.myClasses).addClass('selected');
    } else if (option == 'updates') {
      $(this.refs.bar).css({
        transform: 'translateX(200%)'
      });
        $(this.refs.updates).addClass('selected');
    } else if (option == 'settings') {
      $(this.refs.bar).css({
        transform: 'translateX(300%)'
      });
      $(this.refs.settings).addClass('selected');
    }
  },
  render: function() {
    return (
      <div className='TopBar-Wrapper'>
        <div className='TopBar-Header'>
          <i className="fa fa-file" aria-hidden="true"></i>
          <div className='TopBar-Logo-Typeface'>UCSD Notes</div>
        </div>
        <div className='TopBar' ref='topBar'>
          <div className='TopBar-Button selected' ref='myNotes' onClick={function() {
            appRoot.loadPage('myNotes');
          }}>
            <i className="fa fa-users" aria-hidden="true"></i>
            <div>My Classes</div>
          </div>
          <div className='TopBar-Button' ref='myClasses' onClick={function() {
            appRoot.loadPage('myClasses');
          }}>
            <i className="fa fa-plus" aria-hidden="true"></i>
            <div>Follow</div>
          </div>
          <div className='TopBar-Button' ref='updates' onClick={function() {
            appRoot.loadPage('updates');
          }}>
            <i className="fa fa-bell" aria-hidden="true"></i>
            <div>Updates</div>
          </div>
          <div className='TopBar-Button' ref='settings' onClick={function() {
            appRoot.loadPage('settings');
          }}>
            <i className="fa fa-cog" aria-hidden="true"></i>
            <div>Settings</div>
          </div>
          <div ref='bar' className='TopBar-Bar'></div>
        </div>
      </div>
    );
  }
});

var NotePreview = React.createClass({
  getInitialState: function() {
    return {
      isLiked: false,
      isOwned: false,
      isCreated: false
    }
  },
  componentDidMount: function() {
    var me = this;
    $.ajax({
      type: 'POST',
      url: '/api/notes/is-liked/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: this.props.data._id
      }),
      success: function(response) {
        me.setState({'isLiked': response.data});
      }
    });
    $.ajax({
      type: 'POST',
      url: '/api/notes/is-created/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: this.props.data._id
      }),
      success: function(response) {
        me.setState({'isCreated': response.data});
      }
    });
  },
  changeLike: function(event) {
    var delta = !this.state.isLiked;
    this.setState({isLiked: delta})
    $.ajax({
      type: 'POST',
      contentType: 'json',
      dataType: 'json',
      url: '/api/notes/change-like/',
      data: JSON.stringify({
        delta: delta,
        userId: localStorage.getItem('userId'),
        noteId: this.props.data._id
      })
    });
  },
  render: function() {
    var me = this;
    return (
      <div ref='me' className='MyClass-Note-Row'>
        <i 
          className={this.state.isLiked ? 'fa fa-heart like MyClass-Note-Like' : 'fa fa-heart MyClass-Note-Like'}
          aria-hidden="true"
          onClick = { this.changeLike }
        ></i>
        <div className='MyClass-Note' onClick={function() {
          var data = me.props.data;
          data['isLiked'] = me.state.isLiked;
          data['isOwned'] = me.state.isOwned;
          data['isCreated'] = me.state.isCreated;
          appRoot.loadNote(data, function(delta){
            me.setState({isLiked: delta});
          }, function() {
            $(me.refs.me).css({'display': 'none'})
          });
        }}>
          <div>{ this.props.data.Name }</div>
          <i className="fa fa-ellipsis-h" aria-hidden="true"></i>
        </div>
      </div>
    );
  }
})

var Class = React.createClass({
  getInitialState: function() {
    return {
      results: [ ]
    }
  },
  show: function(classObj) {
    var me = this;
    $(this.refs.content).css({
      transform: 'translateX(0)'
    });
    this.refs.classTitle.innerText = classObj.ClassName + ' Notes';
    $.ajax({
      type: 'POST',
      url: '/api/class/get-notes/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        classInstanceLinkId: classObj.ClassInstanceLinkId
      }),
      success: function(response) {
        me.setState({results: response.data})
      }
    });
  },
  hide: function() {
    $(this.refs.content).css({
      transform: 'translateX(100%)'
    });
  },
  render: function() {
    var me = this;
    var suggestionBox = (<div>
        {this.state.results.map(function(obj, index){
          return (<NotePreview data={obj} />);
        })}
      </div>);

    return (
      <div className='Note'>
        <div ref='content' className='Note-Content'>
          <div onClick={this.hide} className='button'>
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
            <div>Back</div>
          </div>
          <div ref='classTitle' className='Note-Content-Title'>
          </div>
          { suggestionBox }
        </div>
      </div>
    );
  }
});

var ClassPreview = React.createClass({
  follow: function() {
    var me = this;
    var className = this.props.isMine ? ' fa-times' : ' fa-plus';
    $(this.refs.followIcon).removeClass(className);
    $(this.refs.followIcon).addClass('fa-spinner fa-pulse');
    $.ajax({
      type: 'POST',
      url: '/api/class/follow/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        classInstanceLinkId: this.props.data.ClassInstanceLinkId
      }),
      success: function() {
        $(me.refs.followIcon).addClass(className);
        $(me.refs.followIcon).removeClass('fa-spinner fa-pulse');
      }
    });
  },
  unfollow: function() {
    var me = this;
    var className = this.props.isMine ? ' fa-times' : ' fa-plus';
    $(this.refs.followIcon).removeClass(className);
    $(this.refs.followIcon).addClass('fa-spinner fa-pulse');
    $.ajax({
      type: 'POST',
      url: '/api/class/unfollow/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        classInstanceLinkId: this.props.data.ClassInstanceLinkId
      }),
      success: function() {
        $(me.refs.followIcon).addClass(className);
        $(me.refs.followIcon).removeClass('fa-spinner fa-pulse');
      }
    });
  },
  render: function() {
    var me = this;

    var followButton;
    if (!this.props.isMine) {
      followButton = (<div>Follow</div>);
    } else {
      followButton = (<div>Unfollow</div>);
    }

    return (
      <div ref='classObject' className='MyClass'>
        <div
          className='MyClass-Header'
        >
          <div className='MyClass-Instructor'>{this.props.data.InstructorName}</div>
          <div className='MyClass-Title'>{this.props.data.ClassName}</div>
          <br />
          <div className='Button-Row'>
            <div className='Button-Col'>
              <div 
                className='button'
                onClick={function() {
                  appRoot.loadClass(me.props.data);
                }}
              >
                <i 
                  ref='directionIcon' 
                  className='fa fa-folder-open' 
                  aria-hidden='true'
                ></i>
                <div>See Notes</div>
              </div> 
            </div>
            <div className='Button-Col'>
              <div className='button' onClick={this.props.isMine ? this.unfollow : this.follow}>
                <i 
                  ref='followIcon' 
                  className={'fa' + ( this.props.isMine ? ' fa-times' : ' fa-plus')} 
                  aria-hidden='true'
                ></i>
                { followButton }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

var ClassSearch = React.createClass({
  getInitialState: function() {
    return {
      results: [ ],
      default: [ ],
      isEmpty: true
    }
  },
  handleChange: function(event) {
    var me = this;
    var searchTerm = this.refs.classSearch.value.trim();

    if (searchTerm == '') {
      this.setState({
        results: [ ],
        isEmpty: true
      });
    } else {
      this.setState({
        isEmpty: false
      });
      $(this.refs.searchIcon).removeClass('fa-search');
      $(this.refs.searchIcon).addClass('fa-spinner fa-pulse');
      $.ajax({
        type: 'POST',
        url: '/api/class/search/',
        contentType: 'json',
        dataType: 'json',
        data: JSON.stringify({
          userId: localStorage.getItem('userId'),
          term: searchTerm,
          isSearchingMyClasses: this.props.isMine
        }),
        success: function(response) {
          var currentSearchTerm = me.refs.classSearch.value.trim();
          if (currentSearchTerm == searchTerm) {
            me.setState({results: response.data});
            $(me.refs.searchIcon).removeClass('fa-spinner fa-pulse');
            $(me.refs.searchIcon).addClass('fa-search');
          } else if (currentSearchTerm == '') {
            $(me.refs.searchIcon).removeClass('fa-spinner fa-pulse');
            $(me.refs.searchIcon).addClass('fa-search');
          }
        }
      });
    }
  },
  show: function() {
    $(this.refs.content).addClass('show');
  },
  hide: function() {
    $(this.refs.content).removeClass('show');
  },
  biggerFocus: function() {
    $(this.refs.classSearch).focus();
  },
  componentDidMount: function() {
    this.updateDefault();
  },
  updateDefault: function() {
    var me = this;
    if (localStorage.getItem('userId')) {
      $.ajax({
        type: 'POST',
        url: '/api/class/get-all/',
        contentType: 'json',
        dataType: 'json',
        data: JSON.stringify({
          userId: localStorage.getItem('userId'),
          isSearchingMyClasses: this.props.isMine
        }),
        success: function(response) {
          me.setState({
            default: response.data
          });
          me.forceUpdate();
          setTimeout(me.updateDefault, 500);
        }
      });
    } else {
      setTimeout(this.updateDefault, 250);
    }
  },
  render: function() {
    var me = this;

    var suggestionBox;
    if (this.state.results.length > 0) {
      suggestionBox = (<div>
        {this.state.results.map(function(obj, index){
          return (<ClassPreview data={obj} isMine={me.props.isMine} />);
        })}
      </div>);
    } else if (this.state.results.length == 0 && !this.state.isEmpty) {
      suggestionBox = (<div className='Sad-Holder'>
        <div className='Sad-Holder-Container'>
          <img src='/static/img/sad.svg' className='Sad-Image' />
          <div>No search results!</div>
        </div>
      </div>); // placeholder for now
    } else {
      if (testingOption == 'A') {
        suggestionBox = (<div className='Sad-Holder'>
          <div className='Sad-Holder-Container'>
            <img src='/static/img/search.svg' className='Sad-Image' />
            <div>Start searching for classes!</div>
          </div>
        </div>); // placeholder for now
      } else if (testingOption == 'B') {
        if (this.state.default.length == 0) {
          if (this.props.isMine) {
            suggestionBox = (<div className='Sad-Holder'>
              <div className='Sad-Holder-Container'>
                <img src='/static/img/sad.svg' className='Sad-Image' />
                <div>You aren&#39;t following any classes!</div>
              </div>
            </div>); // placeholder for now
          } else {
            suggestionBox = (<div className='Sad-Holder'>
              <div className='Sad-Holder-Container'>
                <img src='/static/img/sad.svg' className='Sad-Image' />
                <div>No more classes for you to follow!</div>
              </div>
            </div>); // placeholder for now
          }
        } else {
          suggestionBox = (<div>
          {this.state.default.map(function(obj, index){
            return (<ClassPreview data={obj} isMine={me.props.isMine} />);
          })}
          </div>);
        }
      }
    }

    return (
      <div>
        <div 
          className='ClassSearch-Search-Input' 
          onClick={ this.biggerFocus }
        >
          <div className='icon'>
            <i ref='searchIcon' className="fa fa-search" aria-hidden="true"></i>
          </div>
          <input 
            ref='classSearch' 
            placeholder='Search for a class... ex. COGS 120' 
            spellCheck='false' 
            onChange={ this.handleChange } 
          />
        </div>
        <br />
        <div>
          { suggestionBox }
        </div>
      </div>
    );
  }
});

var Notification = React.createClass({
  onClick: function() {
    appRoot.refreshNote(this.props.data.NoteObject);
    appRoot.loadNote(this.props.data.NoteObject);
  },
  render: function() {
    return (
      <div className='Notification' onClick={this.onClick}>
        <div className='Notification-Description'>
          { this.props.data.UserObject.FirstName + ' ' + this.props.data.UserObject.LastName }&nbsp;just shared a new note named&nbsp;{this.props.data.NoteObject.Name}&nbsp;in&nbsp;{ this.props.data.ClassInstanceLink.ClassObject.Name + ' with ' + this.props.data.ClassInstanceLink.InstructorObject.Name }!
        </div>
        <div className='Notification-Timestamp'>
          { this.props.data.CreatedAt }
        </div>
      </div>
    );
  }
});

var Notifications = React.createClass({
  getInitialState: function() {
    return {
      results: [ ]
    }
  },
  componentDidMount: function() {
    this.load();
  },
  load: function() {
    if (localStorage.getItem('userId')) {
      var me = this;
      $.ajax({
        type: 'POST',
        url: '/api/notifications/',
        contentType: 'json',
        dataType: 'json',
        data: JSON.stringify({
          userId: localStorage.getItem('userId'),
        }),
        success: function(response) {
          me.setState({results: response.data});
          setTimeout(me.load, 5000);
        }
      });
    } else {
      setTimeout(this.load, 250);
    }
  },
  render: function() {
    var me = this;
    return (
      <div>
        {this.state.results.map(function(obj, index){
          return (<Notification data={obj} />);
        })}
      </div>
    );
  }
});

var Settings = React.createClass({
  update: function(data) {
    this.refs.firstName.value = data['FirstName'];
    this.refs.lastName.value = data['LastName'];
    this.refs.email.value = data['UCSDEmailAddress'];
  },
  postUpdate: function() {
    $.ajax({
      type: 'POST',
      url: '/api/settings/update/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        FirstName: this.refs.firstName.value.trim(),
        LastName: this.refs.lastName.value.trim(),
        UCSDEmailAddress: this.refs.email.value.trim()
      }),
      success: function(response) {
        // TODO: make this update all data using this user's name

      }
    });
  },
  onKeyDownInput: function(event) {
    if (event.which === 13) {
      this.postUpdate();
    }
  },
  render: function() {
    return (
      <div>
        <div className='row'>
          <div className='col'>
            <div className='textbox'>
              <div>First Name</div>
              <input ref='firstName' placeholder='ex. John' onKeyDown={ this.onKeyDownInput } />
            </div>
          </div>
          <div className='col'>
            <div className='textbox'>
              <div>Last Name</div>
              <input ref='lastName' placeholder='ex. Doe' onKeyDown={ this.onKeyDownInput } />
            </div>
          </div>
        </div>
        <div className='textbox'>
          <div>UCSD Email Address</div>
          <input ref='email' placeholder='ex. jdoe@ucsd.edu' onKeyDown={ this.onKeyDownInput } />
        </div>
        <div className='divider'></div>
        <br />
        <div className='Button-Row'>
          <div className='Button-Col'>
            <div className='button' onClick={ this.postUpdate }>
              <i className="fa fa-floppy-o" aria-hidden="true"></i>
              <div>Save Changes</div>
            </div>
          </div>
          <div className='Button-Col'>
            <div className='button' onClick={ function() {
              appRoot.logout();
            } }>
              <i className="fa fa-sign-out" aria-hidden="true"></i>
              <div>Logout</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

var Body = React.createClass({
  selectPage: function(option) {
    if (option == 'myNotes') {
      $(this.refs.bodyCarousel).css({
        transform: 'translateX(0)'
      });
    } else if (option == 'myClasses') {
      $(this.refs.bodyCarousel).css({
        transform: 'translateX(-25%)'
      });
    } else if (option == 'updates') {
      $(this.refs.bodyCarousel).css({
        transform: 'translateX(-50%)'
      });
    } else if (option == 'settings') {
      $(this.refs.bodyCarousel).css({
        transform: 'translateX(-75%)'
      });
    }
  },
  updateMySettings: function() {
    var me = this;
    $.ajax({
      type: 'POST',
      url: '/api/settings/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
      }),
      success: function(response) {
        me.refs.settings.update(response.data);
      }
    });
  },
  render: function() {
    var me = this;
    return (
      <div className='Body'>
        <div ref='bodyCarousel' className='Body-Carousel'>
          <div className='Body-Pane'>
            <ClassSearch ref='classSearch' isMine={true} />
          </div>
          <div className='Body-Pane'>
            <ClassSearch ref='classSearch' isMine={false} />
          </div>
          <div className='Body-Pane'>
            <Notifications />
          </div>
          <div className='Body-Pane'>
            <Settings ref='settings' />
          </div>
        </div>
        <div className='Body-Add-Note' onClick={function() {
          appRoot.makeNote();
        }}>
          <div>
            <i className="fa fa-pencil" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    );
  }
});

var Note = React.createClass({
  getInitialState: function() {
    return {
      _id: '',
      Week: 1,
      Name: '',
      Body: '',
      isMine: false,
      isLiked: false,
      isCreated: false
    }
  },
  show: function(note, likeCallback, deleteCallback) {
    $(this.refs.content).css({
      transform: 'translateX(0)'
    });
    this.likeCallback = likeCallback;
    this.deleteCallback = deleteCallback;
    this.setState(note);
  },
  hide: function() {
    $(this.refs.content).css({
      transform: 'translateX(100%)'
    });
  },
  refreshData: function(note) {
    var me = this;
    $.ajax({
      type: 'POST',
      url: '/api/notes/is-liked/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: note._id
      }),
      success: function(response) {
        me.setState({'isLiked': response.data});
      }
    });
    $.ajax({
      type: 'POST',
      url: '/api/notes/is-created/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: note._id
      }),
      success: function(response) {
        me.setState({'isCreated': response.data});
      }
    });
  },
  likeClick: function(event) {
    $(this.refs.likeButton).toggleClass('like');
    var delta = $(this.refs.likeButton).hasClass('like');
    if (this.likeCallback) {
      this.likeCallback(delta);
    }
    if (delta) {
      this.refs.likeText.innerText = 'Unlike';
    } else {
      this.refs.likeText.innerText = 'Like'
    }
    $.ajax({
      type: 'POST',
      url: '/api/notes/change-like/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: this.state._id,
        delta: delta
      })
    });
  },
  deleteClick: function(event) {
    if (this.deleteCallback) {
      this.deleteCallback();
    }
    $.ajax({
      type: 'POST',
      url: '/api/notes/delete/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        noteId: this.state._id
      }),
      success: function(response) {
        appRoot.closeNote();
      }
    });
  },
  render: function() {
    var me = this;
    var created = (<div></div>);
    if (this.state.isCreated) {
      created = (
        <div>
          <br />
          <div onClick={ this.deleteClick } className='button'>
            <i className="fa fa-trash" aria-hidden="true"></i>
            <div>Delete</div>
          </div>
        </div>
      );
    }

    return (
      <div className='Note'>
        <div ref='content' className='Note-Content'>
          <div onClick={this.hide} className='button'>
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
            <div>Back</div>
          </div>
          <div className='Note-Content-Title'>
            { this.state.Name }
          </div>
          <div className='divider'></div>
          <div className='Note-Text'>
            { this.state.Body }
          </div>
          <div className='divider'></div>
          <br />
          <div 
            ref='likeButton'
            className={ 'button Button-Left-Space like-button' + (this.state.isLiked ? ' like' : '')}
            onClick = { this.likeClick }
          >
            <i className='fa fa-heart' aria-hidden="true"></i>
            <div ref='likeText'>{ this.state.isLiked ? 'Unlike' : 'Like' }</div>
          </div>
          { created }
        </div>
      </div>
    );
  }
});

var MakeNote = React.createClass({
  getInitialState: function() {
    return {
      resultIndex: -1,
      results: [ ],
      debounce: false
    }
  },
  handleChange: function(event) {
    var me = this;
    var searchTerm = this.refs.classSearch.value.trim();
    this.setState({ resultIndex: -1 });
    if (searchTerm == '') {
      this.setState({results: [ ]});
    } else {
      $(this.refs.searchIcon).removeClass('fa-search');
      $(this.refs.searchIcon).addClass('fa-spinner fa-pulse');
      $.ajax({
        type: 'POST',
        url: '/api/class/search/',
        contentType: 'json',
        dataType: 'json',
        data: JSON.stringify({
          userId: localStorage.getItem('userId'),
          term: searchTerm,
          isSearchingMyClasses: true
        }),
        success: function(response) {
          var currentSearchTerm = me.refs.classSearch.value.trim();
          if (currentSearchTerm == searchTerm) {
            $(me.refs.searchIcon).addClass('fa-search');
            $(me.refs.searchIcon).removeClass('fa-spinner fa-pulse');
            me.setState({results: response.data});
          } else if (currentSearchTerm == '') {
            $(me.refs.searchIcon).addClass('fa-search');
            $(me.refs.searchIcon).removeClass('fa-spinner fa-pulse');
          }
        }
      });
    }
  },
  onKeyDownInput: function(event) {
    // capture enter or tab as capturing the closest option available
    if ((event.which === 13 || event.which === 9) && 
        this.state.results.length > 0) {
      this.refs.classSearch.value = this.state.results[0].ClassName;
      this.setState({ resultIndex: 0 });
    }
    return true;
  },
  show: function() {
    $(this.refs.content).addClass('show');
    this.setState({ resultIndex: -1 });
  },
  hide: function() {
    $(this.refs.content).removeClass('show');
  },
  onSuggestionClick: function(event) {
    var selectedText = event.target.innerText.trim();
    for (var index = 0; index < this.state.results.length; index++) {
      var result = this.state.results[index];
      if (result.ClassName == selectedText) {
        this.refs.classSearch.value = selectedText;
        this.setState({ resultIndex: index });
        break;
      }
    }
  },
  createNote: function() {
    var me = this;

    if (this.state.debounce) {
      return;
    }

    if (this.state.resultIndex == -1) {
      console.log('no class selected')
      return;
    }

    var noteName = this.refs.name.value.trim();
    if (noteName.length == 0) {
      // error reporting for note name
      console.log('no name!');
      return;
    }

    var weekNumber = this.refs.weekNumber.value;
    var noteText = this.refs.noteText.value;

    this.setState({debounce: true});
    $.ajax({
      type: 'POST',
      contentType: 'json',
      dataType: 'json',
      url: '/api/notes/create/',
      data: JSON.stringify({
        userId: localStorage.getItem('userId'),
        Name: noteName,
        Week: weekNumber,
        Body: noteText,
        ClassInstanceLinkId: this.state.results[this.state.resultIndex].ClassInstanceLinkId
      }),
      success: function(response) {
        // TODO: make this update all data since new note was created
        appRoot.closeMakeNote();
        me.refs.classSearch.value = '';
        me.refs.name.value = '';
        me.refs.weekNumber.value = 1;
        me.refs.noteText.value = '';
        me.setState({debounce: false});
      }
    });
  },
  biggerFocus: function() {
    $(this.refs.classSearch).focus();
  },
  autoSubmit: function(event) {
    if (event.which === 13) {
      this.createNote();
    }
  },
  uploadFile: function (event) {
    var me = this;

    if (this.state.debounce) {
      return;
    }

    var fd = new FormData();    
    fd.append('file', this.refs.fileInput.files[0]);

    $(this.refs.loadingIcon).removeClass('fa-cloud-upload');
    $(this.refs.loadingIcon).addClass('fa-spinner fa-pulse');
    this.setState({debounce: true});
    $.ajax({
      url: '/api/ocr/',
      data: fd,
      processData: false,
      contentType: false,
      type: 'POST',
      success: function(response) {
        $(me.refs.loadingIcon).removeClass('fa-spinner fa-pulse');
        $(me.refs.loadingIcon).addClass('fa-cloud-upload');
        me.refs.noteText.value = response.data;
        me.setState({debounce: false});
      } 
    });

    event.preventDefault()
  },
  render: function() {
    var me = this;

/*
            <div className='divider'></div>
            <div className='Note-File-Upload-Container'>
              <label className='button'>
                <form ref='form' encType='multipart/form-data'>
                  <input 
                    name='file'
                    type='file' 
                    accept='image/x-png, image/jpeg'
                    required tabIndex='-1' 
                    ref='fileInput'
                    onChange={ this.uploadFile }
                  />
                </form>

                <i ref='loadingIcon' className="fa fa-cloud-upload" aria-hidden="true"></i>
                <div>Parse Picture</div>
              </label>
            </div>
*/

    var addPage = (<div></div>);
    if (this.state.resultIndex != -1) {
        addPage = (
          <div className='Note-Add-Page-Container'>
            <div className='divider'></div>
            <br />
            <div className='row'>
              <div className='col'>
                <div className='textbox'>
                  <div>Note Name</div>
                  <input ref='name' placeholder='ex. COGS 120 Note' onKeyDown={ this.autoSubmit } />
                </div>
              </div>
              <div className='col'>
                <div className='textbox'>
                  <div>Week Number</div>
                  <input ref='weekNumber' type='number' minValue='0' maxValue='10' defaultValue='1' step='1' onKeyDown={ this.autoSubmit } />
                </div>
              </div>
            </div>



            <div className='divider'></div>
            <br />
            <div className='textarea'>
              <div>My Page Text</div>
              <textarea ref='noteText' placeholder='I love COGS 120!'></textarea>
            </div>
            <div className='divider'></div>
            <div className='Note-Create-Button-Container'>
              <div 
                className='button'
                onClick={ this.createNote }
              >
                <i className="fa fa-check" aria-hidden="true"></i>
                <div>Create my note</div>
              </div>
            </div>


          </div>
        );
    }

    var suggestionBox;
    if (this.state.resultIndex == -1) {
      suggestionBox = (<div className='Note-Class-Suggestion-Box'>
        {this.state.results.map(function(obj, index){
          return (<div className='Note-Class-Suggestion'
            onClick={ me.onSuggestionClick } >
            { obj.ClassName }
          </div>);
        })}
      </div>);
    } else {
      suggestionBox = (<div></div>); // placeholder for now
    }

    return (
      <div className='Note'>
        <div ref='content' className='Note-Content'>
          <div onClick={this.hide} className='button'>
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
            <div>Back</div>
          </div>
          <div className='Note-Content-Title'>
            Note Creator
          </div>
          <div className='divider'></div>
          <br />
          <div className='ClassSearch-Search-Input' onClick={ this.biggerFocus }>
            <div className='icon'>
              <i className="fa fa-search" ref='searchIcon' aria-hidden="true"></i>
            </div>
            <input 
              ref='classSearch'
              spellCheck='false'
              onKeyDown={ this.onKeyDownInput }
              onChange={ this.handleChange } 
              placeholder='Search for a class... ex. COGS 120' 
            />
            { suggestionBox }
          </div>
          <br />
          {addPage}
        </div>
      </div>
    );
  }
});

var LoginPage = React.createClass({
  show: function() {
    $(this.refs.content).addClass('show');
  },
  hide: function() {
    $(this.refs.content).removeClass('show');
  },
  onKeyDownInput: function(event) {
    if (event.which === 13) {
      this.login();
    }
  },
  login: function() {
    var me = this;
    $.ajax({
      type: 'POST',
      url: '/api/login/',
      contentType: 'json',
      dataType: 'json',
      data: JSON.stringify({
        UCSDEmailAddress: this.refs.email.value.trim(),
        Password: this.refs.password.value.trim()
      }),
      success: function(response) {
        if (response.success) {
          localStorage.setItem('userId', response.data.userId);
          appRoot.updateMySettings();
          me.hide();
        }
      }
    });
  },
  logout: function() {
    localStorage.removeItem('userId');
    appRoot.loadPage('myNotes');
    this.show();
  },
  render: function() {
    return (
      <div className='Login-Panel'>
        <div ref='content' className='Login-Page show'>
          <div className='Login-Title'>
            <i className="fa fa-file" aria-hidden="true"></i>
            <div className='Login-Title-Logo-Typeface'>UCSD Notes</div>
          </div>
          <div className='Login-Input'>
            <div>UCSD Email Address</div>
            <input ref='email' placeholder='ex.jdoe@ucsd.edu' spellCheck="false" onKeyDown={this.onKeyDownInput} />
            <div>Password</div>
            <input ref='password' type='password' onKeyDown={this.onKeyDownInput} />
          </div>
          <div className='Login-Options'>
            <div onClick={this.login} className='button'>
              <div>Signup</div>
            </div>
            <div onClick={this.login} className='button'>
              <div>Login</div>
            </div>
          </div>
          
        </div>
      </div>
    );
    /*
            <div className='button'>
              <div>Signup</div>
            </div>
    */

    //<div className='Login-Forgot-Password'>Forgot your password?</div>
  }
});

var App = React.createClass({
  componentDidMount: function() {
    appRoot = this;
    if (localStorage.getItem('userId')) {
      this.refs.loginPage.hide();
      this.updateMySettings();
    }
  },
  loadPage: function(option) {
    this.refs.topBar.selectPage(option);
    this.refs.body.selectPage(option);
  },
  loadClass: function(classObj) {
    this.refs.class.show(classObj);
  },
  closeClass: function() {
    this.refs.class.hide();
  },
  refreshNote: function(data) {
    this.refs.note.refreshData(data);
  },
  loadNote: function(note, likeCallback, deleteCallback) {
    this.refs.note.show(note, likeCallback, deleteCallback);
  },
  closeNote: function() {
    this.refs.note.hide();
  },
  makeNote: function() {
    this.refs.makeNote.show();
  },
  closeMakeNote: function() {
    this.refs.makeNote.hide();
  },
  updateMySettings: function() {
    this.refs.body.updateMySettings();
  },
  logout: function() {
    this.refs.loginPage.logout();
  },
  render: function() {
    return (
      <div className='App'>
        <TopBar ref='topBar' />
        <Body ref='body' />
        <Class ref='class' />
        <Note ref='note' />
        <MakeNote ref='makeNote' />
        <LoginPage ref='loginPage' />
      </div>
    );
  }
});

;$(function() {
  ReactDOM.render(
    <App />,
    document.getElementById('page-content')
  );
});