import React, { useState, useRef, useEffect, useLayoutEffect, useContext} from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Separator from '../../components/Separator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PhotoLabelViewer from './../../components/PhotoLabelViewer';
import Share from 'react-native-share';
import {
  Alert,
  ActionSheetIOS,
  Button,
  Image,
  Icon,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// import {
//   Colors,
//   DebugInstructions,
//   Header,
//   LearnMoreLinks,
//   ReloadInstructions,
// } from 'react-native/Libraries/NewAppScreen';
// import RNFetchBlob from 'rn-fetch-blob';
import SqliteManager from '../../services/SqliteManager';
import { transformLabels } from '../../util/sqliteHelper';
import {useIsFocused} from '@react-navigation/native';
import { ISSUE_STATUS, getIssueStatusById } from './IssueEnum';
import { ISSUE_TYPE } from '../../configs/issueTypeConfig'
import { PROJECT_STATUS } from './ProjectEnum';
import { transformIssues } from '../../util/sqliteHelper';
import { WorkItemList } from './WorkItemListScreen'
import { ButtonGroup } from 'react-native-elements';



const IssueScreen = ({ navigation, route }) => {
  const axios = require('axios');
  const isFocused = useIsFocused();
  const item = route.params.item;
  const projectId = route.params.projectId;
  const [action, setAction] = useState(route.params.action);
  const [issueId, setIssueId] = useState(item.id);
  const [selectedIssueLocationId, setSelectedIssueLocationId] = useState(null);
  const [violationType, setViolationType] = useState(route.params.violation_type?route.params.violation_type:item.violation_type);
  const [issueType, setIssueType] = useState(item.type);
  const [issueTypeRemark, setIssueTypeRemark] = useState(item.type_remark);
  const [issueTrack, setIssueTrack] = useState(item.tracking);
  const [issueLocationText, setIssueLocationText] = useState(item.location);
  const [issueTaskText, setIssueTaskText] = useState(item.activity);
  const [responsibleCorporation, setResponsibleCorporation] = useState(item.responsible_corporation);
  const [issueAssigneeText, setIssueAssigneeText] = useState(item.assignee);
  const [issueAssigneePhoneNumberText, setIssueAssigneePhoneNumberText] = useState(item.assignee_phone_number);
  const [issueSafetyManagerText, setIssueSafetyManagerText] = useState(item.safetyManager);
  const [issueAttachments, setIssueAttachments] = useState(item.attachments);
  const [issueLabels, setIssueLabels] = useState(transformLabels(item.labels));
  const [issueStatus, setIssueStatus] = useState(item.status);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const keyboardDidShowListener = useRef();
  const keyboardDidHideListener = useRef();

  const onKeyboardShow = event =>
    setKeyboardOffset(event.endCoordinates.height);
  const onKeyboardHide = () => setKeyboardOffset(0);

  const issueTrackToggleHandler = () => {
    setIssueTrack(previousState => !previousState);
  };

  const WorkItemListHandler = async () => {
    navigation.navigate('WorkItemList', { 
      project: route.params.project,
      projectId: route.params.projectId,
      setIssueTaskText, 
      setIssueAssigneeText, 
      setIssueAssigneePhoneNumberText: assignee_phone_number =>{setIssueAssigneePhoneNumberText(assignee_phone_number)}
      
    })};


  const attachmentAddHandler = async image => {
    const imageUri = image.uri;
    const transformedImageUri = imageUri.replace('file://', '');

    const newAttachment = {
      image: transformedImageUri,
      remark: '',
      issue_id: issueId,
    };

    await SqliteManager.createIssueAttachment(newAttachment);

    const allAttachments = await SqliteManager.getIssueAttachmentsByIssueId(
      issueId,
    );
    const sortedAttachments = allAttachments.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    const latestAttachments = sortedAttachments[0];

    const newIssueAttachments = issueAttachments.concat(latestAttachments);
    setIssueAttachments(newIssueAttachments);
  };

  const attachmentDeleteHandler = index => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['??????', '??????'],
        destructiveButtonIndex: [1],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      async buttonIndex => {
        switch (buttonIndex) {
          case 0: // cancel action
            break;
          case 1:
            const targetAttachment = issueAttachments.find(
              (_, attIndex) => attIndex === index,
            );
            await SqliteManager.deleteIssueAttachment(targetAttachment.id);
            const newIssueAttachments = issueAttachments.filter(
              attachment => attachment.id !== targetAttachment.id,
            );
            setIssueAttachments(newIssueAttachments);
            break;
        }
      },
    );
  };

  const remarkChangeHandler = async (index, remark) => {
    const newIssueAttachments = issueAttachments;
    newIssueAttachments[index].remark = remark;

    const targetIssueAttachment = newIssueAttachments[index];
    await SqliteManager.updateIssueAttachment(
      targetIssueAttachment.id,
      targetIssueAttachment,
    );
    setIssueAttachments(newIssueAttachments);
  };

  const imageSelectHandler = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['??????', '??????', '?????????????????????'],
        // destructiveButtonIndex: [1,2],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      buttonIndex => {
        switch (buttonIndex) {
          case 0: // cancel action
            break;
          case 1:
            launchCamera({ mediaType: 'photo', saveToPhotos: true }, res => {
              if (res.errorMessage !== undefined) {
                console.error(`code: ${res.errorCode}: ${res.erroMessage}`);
                return;
              }

              if (!res.didCancel) {
                attachmentAddHandler(res.assets[0]);
              }
            });
            break;
          case 2:
            launchImageLibrary({ mediaType: 'photo' }, res => {
              if (res.errorMessage !== undefined) {
                console.error(`code: ${res.errorCode}: ${res.erroMessage}`);
                return;
              }

              if (!res.didCancel) {
                attachmentAddHandler(res.assets[0]);
              }
            });
        }
      },
    );
  };

  const imageExportHandler = React.useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['??????', '??????????????????'],
        // destructiveButtonIndex: [1,2],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      buttonIndex => {
        switch (buttonIndex) {
          case 0:
            break; // cancel action
          case 1:
            const shareOption = {
              title: 'MyApp',
              message: '????????????',
              url: 'file://' + item.image.uri,
              type: 'image/ief',
              subject: '????????????', // for email
            };
            Share.open(shareOption);
            break;
        }
      },
    );
  }, [item.image.uri]);

  
  const issueStatusClickHandler = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['??????', '?????????', '?????????????????????', '???????????????????????????'],
        // destructiveButtonIndex: [1,2],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      buttonIndex => {
        switch (buttonIndex) {
          case 0:
            break; // cancel action
          case 1:
            setIssueStatus(ISSUE_STATUS.lowRisk.id);
            break;
          case 2:
            setIssueStatus(ISSUE_STATUS.mediumRisk.id);
            break;
          case 3:
            setIssueStatus(ISSUE_STATUS.highRisk.id);
            break;
        }
      },
    );
  };

  const issueImageClickHandler = () => {
    navigation.navigate('Photo', {
      issueId: issueId,
      image: item.image,
      issueLabels: issueLabels,
      setIssueLabels: labels => {
        setIssueLabels(labels);
      },
    })
  };


  function decideIssueTypes(violationType){
  
    for (i=0; i<ISSUE_TYPE[0].titles.length; i++){
      if (violationType != ISSUE_TYPE[0].titles[i]){
        //???????????????type
      }
      else{
        //??????????????????
        return ISSUE_TYPE[i+1].type
      }
    }
  }

  const newIssueTypeClickHandler = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: violationType?decideIssueTypes(violationType):['---?????????????????????---'],
        // destructiveButtonIndex: [1,2],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      buttonIndex => {
        if (buttonIndex == 0){ 
          // cancel action
        }
        else{
          setIssueType(`${decideIssueTypes(violationType)[buttonIndex]}`)
        }
      },
    );
  };

  const violationTypeClickHandler = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['??????', '??????', '??????', '??????', '??????', '?????????', '??????', '??????', '????????????', '??????', '??????'],
        // destructiveButtonIndex: [1,2],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'light', //'dark'
      },
      buttonIndex => {
        if (buttonIndex == 0){
          // cancel action
        }
        else{
          setViolationType(ISSUE_TYPE[0].titles[buttonIndex-1])
          setIssueType('')
        }
      },
    );
  };

  const responsibleCorporationclickHandler = async () => {
    var options = ['??????','??????????????????']
    for (i of await SqliteManager.getWorkItemsByProjectId(projectId)){
      options.splice(1, 0, i.company)
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: options,
        cancelButtonIndex :0,
        userInterfaceStyle:'light',
      },
      (buttonIndex) => {
        if (buttonIndex == 0){
          setResponsibleCorporation(responsibleCorporation)
        }else if(buttonIndex == options.length-1 ){
          navigation.navigate('WorkItemAdd', { 
            name: 'Create new workitem' ,
            projectId: projectId
          })
        }else{
          setResponsibleCorporation(options[buttonIndex])
        }
      }
    )
  }

  const issueLocationClickHandler = async () => {
    var options = (
      await SqliteManager.getIssueLocationsByProjectId(projectId)
    ).map(item => {return {location:item.location, id:item.id}})
    options.sort((a, b) => {
      if (parseFloat(a.location) != NaN && parseFloat(b.location) != NaN){
        return(parseInt(a.location.replace(/[^\d]/g, "")) - parseInt(b.location.replace(/[^\d]/g, "")))
      }else if(parseFloat(b.location)!= NaN && parseFloat(a.location) == NaN){
        return 1
      }else if(parseFloat(a.location)!= NaN && parseFloat(b.location) == NaN){
        return -1
      }else{
        return 0
      }
    }).push({location:'????????????'}, {location:'??????'})
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: options.map(item => item.location),
        cancelButtonIndex :options.length-1,
        userInterfaceStyle:'light',
      },
      async (buttonIndex) => {
        if (buttonIndex == options.length-1){
          setIssueLocationText(issueLocationText)
        }else if(buttonIndex == options.length-2){
          Alert.prompt(
            '?????????????????????',
            '(???: 2F??????)',
            async (location) => {
              setIssueLocationText(location),
              await SqliteManager.createIssueLocation({
                project_id: projectId,
                location: location,
              });
            },
          )
        }else{
          Alert.alert(`????????????: ${options[buttonIndex].location}`,"???????????????",
            [
              {
                text: "????????????",
                style:'destructive',
                onPress: async () => {
                  await SqliteManager.deleteIssueLocation(options[buttonIndex].id);
                  setIssueLocationText('')
                }
              },
              {
                text: "??????",
                onPress: async () => {
                  setIssueLocationText(options[buttonIndex].location);
                }
              }
            ],
            'light',
          )
        }
      }
    )
  }

  const issueCreateHandler = React.useCallback(async () => {

    const transformedIssue = {
      image_uri: item.image.uri.replace('file://', ''),
      image_width: item.image.width,
      image_height: item.image.height,
      tracking: item.tracking,
      location: item.location,
      responsible_corporation:item.responsible_corporation,
      activity: item.activity,
      assignee: item.assignee,
      assignee_phone_number: item.assignee_phone_number,
      safety_manager: item.safetyManager,
      violation_type: route.params.violation_type,
      type: item.type,
      status: item.status,
      type_remark: item.typeRemark,
      project_id: projectId,
    };

    await SqliteManager.createIssue(transformedIssue);

    const allIssues = await SqliteManager.getAllIssues();
    const sortedIssues = allIssues.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    const latestIssue = sortedIssues[0];

    setIssueId(latestIssue.id);
    setAction('update existing issue');
  }, [item, projectId]);

  const issueUpdateHandler = React.useCallback(async () => {
    const transformedIssue = {
      image_uri: item.image.uri.replace('file://', ''),
      image_width: item.image.width,
      image_height: item.image.height,
      tracking: issueTrack,
      location: issueLocationText,
      activity: issueTaskText,
      responsible_corporation:responsibleCorporation,
      assignee: issueAssigneeText,
      assignee_phone_number: issueAssigneePhoneNumberText,
      safety_manager: issueSafetyManagerText,
      violation_type: violationType,
      type: issueType,
      type_remark: issueTypeRemark,
      project_id: projectId,
      status: issueStatus
    };
    await SqliteManager.updateIssue(issueId, transformedIssue);
  }, [
    issueAssigneeText,
    issueAssigneePhoneNumberText,
    issueId,
    issueLocationText,
    responsibleCorporation,
    issueSafetyManagerText,
    issueTaskText,
    violationType,
    issueType,
    issueTypeRemark,
    issueTrack,
    issueStatus,
    item,
    projectId,
  ]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      const issues = await SqliteManager.getIssuesByProjectId(projectId);
      let projectStatus =  CalculateProjectStatus(issues);
      await SqliteManager.updateProject(projectId, {status: projectStatus});
    });

    return unsubscribe;
  }, [navigation]);

  const CalculateProjectStatus = (issues) => {
      let sum = 0;
      issues.map(i => sum+= (getIssueStatusById(i.status)? getIssueStatusById(i.status).value:0) );
      let risk = Math.ceil(sum/issues.length);
      if(risk==1)
        return PROJECT_STATUS.lowRisk.id;
      else if(risk==2)
        return PROJECT_STATUS.mediumRisk.id;
      else if(risk==3)
        return PROJECT_STATUS.highRisk.id;
      else
        return PROJECT_STATUS.lowRisk.id;
  }

  useEffect(() => {
    action === 'create new issue' && issueCreateHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCreateHandler]);

  useEffect(() => {
    console.log(action);
    action === 'update existing issue' && issueId && issueUpdateHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    issueId,
    issueLocationText,
    issueTaskText,
    responsibleCorporation,
    issueAssigneeText,
    issueAssigneePhoneNumberText,
    issueSafetyManagerText,
    issueType,
    violationType,
    issueTypeRemark,
    issueTrack,
    issueStatus,
    issueUpdateHandler,
  ]);

  useEffect(() => {
    keyboardDidShowListener.current = Keyboard.addListener(
      'keyboardWillShow',
      onKeyboardShow,
    );
    keyboardDidHideListener.current = Keyboard.addListener(
      'keyboardWillHide',
      onKeyboardHide,
    );

    return () => {
      keyboardDidShowListener.current.remove();
      keyboardDidHideListener.current.remove();
    };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <React.Fragment>
          <Button title="??????" onPress={() => imageExportHandler()} />
        </React.Fragment>
      ),
      headerLeft: () => (
        <Button
          title="??????"
          onPress={() => {
            if (!violationType) {
              Alert.alert('?????????????????????');
              return;
            }else if(!issueType){
              Alert.alert('?????????????????????');
              return;
            }else if(!issueLocationText){
              Alert.alert('?????????????????????');
              return;
            }else if(!responsibleCorporation){
              Alert.alert('?????????????????????');
              return;
            }else if(!issueSafetyManagerText){
              Alert.alert('?????????????????????');
              return;
            }
            navigation.goBack();
          }}
        />
      ),
    });
  }, [
    imageExportHandler, 
    navigation,
    issueTrack,
    violationType,
    issueType,
    issueLocationText,
    issueTaskText,
    responsibleCorporation,
    issueAssigneeText,
    issueAssigneePhoneNumberText,
    issueSafetyManagerText,
    issueStatus,
    issueTypeRemark,
  ]);

  return (
    <React.Fragment>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View>
            <PhotoLabelViewer image={item.image} labels={issueLabels} />
            <TouchableOpacity
              style={[
                styles.image,
                { width: item.image.width, height: item.image.height },
              ]}
              onPress={() => issueImageClickHandler()}
            />
          </View>
          <View style={styles.group}>
          <TouchableOpacity onPress={() => violationTypeClickHandler()}>
              <View style={styles.item}>
                <Text style={styles.title}>????????????</Text>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.description}>
                    {violationType ? violationType : '??????????????????'}
                  </Text>
                  <Ionicons
                    style={styles.description}
                    name={'ios-chevron-forward'}
                  />
                </View>
              </View>
            </TouchableOpacity>
            <Separator />
            {violationType != "??????" ?
              (<React.Fragment>
                <TouchableOpacity onPress={() => newIssueTypeClickHandler()}>
                  <View style={styles.item}>
                    <Text style={styles.title}>????????????</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={styles.description}>
                        {issueType ? issueType : '??????????????????'}
                      </Text>
                      <Ionicons
                        style={styles.description}
                        name={'ios-chevron-forward'}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
                <Separator />
              </React.Fragment>
              ) : undefined
            }
            {violationType == "??????" ?
              (<React.Fragment>
                <View style={styles.item}>
                  <Text style={styles.title}></Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      style={styles.textInput}
                      onChangeText={setIssueTypeRemark}
                      defaultValue={issueTypeRemark}
                    />
                  </View>
                </View>
                <Separator />
              </React.Fragment>
              ) : undefined
            }
            <View style={styles.item}>
              <Text style={styles.title}>????????????</Text>
              <View style={{ flexDirection: 'row' }}>
                <Switch
                  onValueChange={() => issueTrackToggleHandler()}
                  value={issueTrack}
                />
              </View>
            </View>
          </View>
          <View style={styles.group}>
            <TouchableOpacity onPress={issueLocationClickHandler}>
            <View style={styles.item}>
              <Text style={styles.title}>????????????</Text>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.textInput}>
                  {!!issueLocationText? issueLocationText:undefined}
                </Text>
                <Ionicons
                  style={styles.description}
                  name={'ios-chevron-forward'}
                />
              </View>
            </View>
            </TouchableOpacity>
            <Separator />
            <TouchableOpacity onPress={responsibleCorporationclickHandler}>
            <View style={styles.item}>
              <Text style={styles.title}>????????????</Text>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.textInput}>
                  {!!responsibleCorporation? responsibleCorporation:undefined}
                </Text>
                <Ionicons
                  style={styles.description}
                  name={'ios-chevron-forward'}
                />
              </View>
            </View>
            </TouchableOpacity>
            <Separator />
            <TouchableOpacity onPress={WorkItemListHandler}>
            <View style={styles.item}>
              <Text style={styles.title}>??????</Text><Text style={{fontSize: 18, color:'#8C8C8C'}}>(??????)            </Text>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.textInput}>
                  {!!issueTaskText? issueTaskText:undefined}
                </Text>
                <Ionicons
                  style={styles.description}
                  name={'ios-chevron-forward'}
                />
              </View>
            </View>
            </TouchableOpacity>
            <Separator />
            {issueTaskText?
              (<React.Fragment>
              <View style={styles.item}>
                <Text style={styles.title}>???????????????</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={setIssueAssigneeText}
                    defaultValue={issueAssigneeText}
                  />
                </View>
              </View>
              <Separator />
              <View style={styles.item}>
                <Text style={styles.title}>?????????????????????</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={setIssueAssigneePhoneNumberText}
                    defaultValue={issueAssigneePhoneNumberText}
                  />
                </View>
              </View>
              <Separator />
              </React.Fragment>
              ) : undefined
            }
            <View style={styles.item}>
              <Text style={styles.title}>????????????</Text>
              <View style={{ flexDirection: 'row' }}>
                <TextInput
                  style={styles.textInput}
                  onChangeText={setIssueSafetyManagerText}
                  defaultValue={issueSafetyManagerText}
                />
              </View>
            </View>
            <Separator />
            <View style={styles.item}>
              <Text style={styles.title}>??????</Text>
              <TouchableOpacity onPress={() => issueStatusClickHandler()}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.textInput}>
                    {!!getIssueStatusById(issueStatus)? getIssueStatusById(issueStatus).name:undefined}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.group}>
          {issueAttachments[0]? undefined:
            <View style={styles.item}>
              <Text style={styles.title}>????????????</Text>
              <TouchableOpacity onPress={() => imageSelectHandler()}>
                <View style={{ flexDirection: 'row' }}>
                    <Text style={{ color: 'goldenrod', fontSize: 18 }}>
                    ?????????????????????
                    </Text>
                    <Ionicons
                    style={{ color: 'goldenrod', fontSize: 22 }}
                    name={'ios-add-circle-outline'}
                    />
                </View>
              </TouchableOpacity>
            </View>}
            {issueAttachments ? (
              issueAttachments.map((a, i) => {
                return (
                  <View key={`issue_attachment_${i}`}>
                    <View style={{ marginBottom: 15, ...styles.item }}>
                      <Text style={styles.title}>???????????????</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => attachmentDeleteHandler(i)}>
                      <Image style={styles.itemImage} source={{ uri: a.image }} />
                    </TouchableOpacity>
                    <View style={{ marginBottom: 15, ...styles.item }}>
                      <Text style={styles.title}>?????????</Text>
                      <TextInput
                        id={a.id}
                        key={a.id}
                        style={styles.textInput}
                        onChangeText={text => remarkChangeHandler(i, text)}
                        defaultValue={a.remark}
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  </View>
                )
              })
            ) : (
              <></>
            )}
          </View>
          <View style={{ marginBottom: keyboardOffset }} />
        </ScrollView>
      </SafeAreaView>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
  text: {
    fontSize: 24,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  itemImage: {
    width: '100%',
    height: 200,
  },
  group: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 15,
  },
  item: {
    paddingVertical: 15,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
  },
  description: {
    fontSize: 18,
    color: 'gray',
  },
  textInput: {
    fontSize: 18,
    color: 'gray',
    width: 180,
    textAlign: 'right',
  },
});

export default IssueScreen;
