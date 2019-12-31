import React from 'react'
import { Editor, EditorState, RichUtils, getDefaultKeyBinding, convertToRaw, Modifier, SelectionState} from 'draft-js'
import 'draft-js/dist/Draft.css'
import './RichEditor.css'
import isElectron from 'is-electron'

const BLOCK_TYPES = [
	{label: 'H1', 						style: 'header-one'},
	{label: 'H2', 						style: 'header-two'},
	{label: 'H3', 						style: 'header-three'},
	{label: 'H4', 						style: 'header-four'},
	{label: 'H5', 						style: 'header-five'},
	{label: 'H6', 						style: 'header-six'},
	{label: 'Blockquote', 		style: 'blockquote'},
	{label: 'Unordered-List', style: 'unordered-list-item'},
	{label: 'Ordered-List', 	style: 'ordered-list-item'}
];

const BlockStyleControls = (props) => {
	const {editorState} = props;
	const selection = editorState.getSelection();
	const blockType = editorState
		.getCurrentContent()
		.getBlockForKey(selection.getStartKey())
		.getType();
	return (
		<div className="RichEditor-controls">
			{BLOCK_TYPES.map((type) =>
				<StyleButton
					key={type.label}
					active={type.style === blockType}
					label={type.label}
					onToggle={props.onToggle}
					style={type.style}
				/>
			)}
		</div>
	);
};

var INLINE_STYLES = [
	 {label: 'Bold', 				style: 'BOLD'},
	 {label: 'Italic',		 	style: 'ITALIC'},
	 {label: 'Underline', 	style: 'UNDERLINE'},
	 {label: 'Code-Block', 	style: 'CODE'},
 ];

 const styleMap = {
 	CODE: {
 		backgroundColor: 'rgba(0, 0, 0, 0.05)',
 		fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
 		fontSize: 16,
 		padding: 2,
 	},
 	ISSUE: {
 		backgroundColor: 'rgba(255, 242, 0, 0.25)'
 	}
 };

	const InlineStyleControls = (props) => {
		const currentStyle = props.editorState.getCurrentInlineStyle();

		return (
			<div className="RichEditor-controls">
				{INLINE_STYLES.map((type) =>
					<StyleButton
						key={type.label}
						active={currentStyle.has(type.style)}
						label={type.label}
						onToggle={props.onToggle}
						style={type.style}
					/>
				)}
			</div>
		);
	};

	const SidePanelControl = (props) => {
		const currentContent = props.editorState.getCurrentContent();
		const currentDocumentDocumentVal = props.editorState.documentDocumentValue;
		return (
			<SidePanelControlButtons
				content={currentContent}
				documentDocumentValue={currentDocumentDocumentVal}
				/>
		)
	}

	class SidePanelControlButtons extends React.Component {
		constructor() {
			super();
			this.AnalyzeDocument = this._AnalyzeDocument.bind(this);
		}


		_AnalyzeDocument(e) {
			e.preventDefault();
			let rawDat = convertToRaw(this.props.content).blocks;
			let paragraph_array = [];
			let key_array = [];
			for(let i = 0; i < rawDat.length; i++) {
				if(rawDat[i]['text'] !== "") {
					paragraph_array.push(rawDat[i]['text']);
					key_array.push(rawDat[i]['key']);
				}
			}
			window.ipcRenderer.send('document-analysis', {"paragraph_array": paragraph_array, "key_array": key_array});
		}

		render() {
			let className = 'RichEditor-textoption';
			return (
				<div className="Side-controls">
					<div className={className} onMouseDown={this.AnalyzeDocument}>
						<span>
							Analyze Document
						</span>
					</div>
				</div>
			)
		}
	}

class StyleButton extends React.Component {
	 constructor() {
		 super();
		 this.onToggle = (e) => {
			 e.preventDefault();
			 this.props.onToggle(this.props.style);
		 };
	 }

	 render() {
		 let className = 'RichEditor-styleButton';
		 if (this.props.active) {
			 className += ' RichEditor-activeButton';
		 }

		 return (
			 <span className={className} onMouseDown={this.onToggle}>
				 {this.props.label}
			 </span>
		 );
	 }
 }

class TextEditor extends React.Component {
	constructor(props) {
    super(props);
		this.state = {
			editorState: EditorState.createEmpty(),
			documentDocumentValue: null,
			documentStat: {}
		};
	  this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({editorState});
    this.handleKeyCommand = this._handleKeyCommand.bind(this);
    this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this);
    this.toggleBlockType = this._toggleBlockType.bind(this);
    this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
  }

	_handleKeyCommand(command, editorState) {
			 const newState = RichUtils.handleKeyCommand(editorState, command);
			 if (newState) {
				 this.onChange(newState);
				 return true;
			 }
			 return false;
		 }

		 // TAB does not work currently
		 _mapKeyToEditorCommand(e) {
			 if (e.keyCode === 9 /* TAB */) {
				 const newEditorState = RichUtils.onTab(
					 e,
					 this.state.editorState,
					 4, /* maxDepth */
				 );
				 if (newEditorState !== this.state.editorState) {
					 this.onChange(newEditorState);
				 }
				 return;
			 }
			 return getDefaultKeyBinding(e);
		 }

		 _toggleBlockType(blockType) {
			 this.onChange(
				 RichUtils.toggleBlockType(
					 this.state.editorState,
					 blockType
				 )
			 );
		 }

		 _toggleInlineStyle(inlineStyle) {
			 this.onChange(
				 RichUtils.toggleInlineStyle(
					 this.state.editorState,
					 inlineStyle
				 )
			 );
		 }

		 _handleDocumentReply(reply) {
			 for(let i = 0; i < reply['paragraph_count']; i++) {
				 // let currentContent = this.state.editorState.getCurrentContent();
				 // let new_selection = SelectionState.createEmpty(reply['diction_stats'][i][1]);
				 // console.log(new_selection);
				 // this.onChange(Modifier.applyInlineStyle(currentContent, new_selection, 'backgroundColor: rgba(255, 242, 0, 0.25)'))

				 /* This is a hack solution until I find out how to change the styles of blocks by block key */
				 let element = document.querySelector('[data-offset-key="' + reply['diction_stats'][i][1] + '-0-0"]');
				 element.style.backgroundColor = "rgba(255, 242, 0, 0.25)";

			 }
		 }

		 componentDidMount() {
			 /* Just some tests for ipcRenderer functions (electron API) */
			 	if (isElectron()) {
					window.ipcRenderer.on('asynchronous-reply', (event, arg) => {
						console.log('main process is ready');
						this.setState({ipc: true});
					});

					window.ipcRenderer.on('document-reply', (event, arg) => {
							this._handleDocumentReply(arg);
					});
					window.ipcRenderer.send('asynchronous-message', 'main process is ready')
				}
			}

  render() {
		var {editorState} = this.state;
		function getBlockStyle(block) {
        switch (block.getType()) {
          case 'blockquote': return 'RichEditor-blockquote';
          default: return null;
        }
      }
    return (
			<div className="TextEditor-root row">
				<div className="col-md-2">
					<SidePanelControl
					editorState={editorState}
					/>
				</div>
				<div className="col-md-10">
					<div className="TextEditor-Toolbar-root">
						<div className="TextEditor-BlockStyles-root">
							<BlockStyleControls
								editorState={editorState}
								onToggle={this.toggleBlockType}
							/>
						</div>
						<div className="TextEditor-InlineStyles-root">
							<InlineStyleControls
								editorState={editorState}
								onToggle={this.toggleInlineStyle}
							/>
						</div>
					</div>
					<div className="TextEditor-Page-root" onClick={this.focus}>
						<Editor
							blockStyleFn={getBlockStyle}
							customStyleMap={styleMap}
							editorState={editorState}
							handleKeyCommand={this.handleKeyCommand}
							keyBindingFn={this.mapKeyToEditorCommand}
							onChange={this.onChange}
							placeholder="Paste Your Text Here..."
							ref="editor"
							spellCheck={true}
						/>
					</div>
				</div>
			</div>
    );
  }
}

export default TextEditor
