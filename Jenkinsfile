pipeline {
    agent any

    environment {
        // Node.js
        NODE_HOME = "/home/azureuser/.nvm/versions/node/v22.23.2"

        // Java
        JAVA_HOME = "/usr/lib/jvm/java-17-openjdk-amd64"
        SONAR_SCANNER_JAVA_HOME = "/usr/lib/jvm/java-21-openjdk-amd64"

        // Sonar Scanner
        SONAR_SCANNER_HOME = "/home/azureuser/sonar-scanner"

        // Android SDK
        ANDROID_HOME = "/home/azureuser/android-sdk"
        ANDROID_SDK_ROOT = "/home/azureuser/android-sdk"

        // PATH
        PATH = "${NODE_HOME}/bin:${SONAR_SCANNER_HOME}/bin:${JAVA_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${env.PATH}"

        // Project
        APP_DIR = "examples/SampleApp"
        APK_PATH = "${APP_DIR}/android/app/build/outputs/apk/release/app-release.apk"

        // SonarQube Credentials
        SONAR_HOST_URL = credentials('sonar-host-url')
        SONAR_TOKEN = credentials('sonar-token')

        // Azure Blob Storage
        AZURE_STORAGE_CONNECTION_STRING = credentials('azure-storage-connection-string')
        AZURE_CONTAINER_NAME = "apk-builds"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Get App Version') {
            steps {
                dir("${APP_DIR}") {
                    script {
                        env.APP_VERSION = sh(
                            script: "node -p \"require('./package.json').version\"",
                            returnStdout: true
                        ).trim()
                        env.VERSIONED_APK_NAME = "app-release-v${env.APP_VERSION}-build${env.BUILD_NUMBER}.apk"
                        echo "App version: ${env.APP_VERSION}, build: ${env.BUILD_NUMBER} -> ${env.VERSIONED_APK_NAME}"
                    }
                }
            }
        }

        stage('Environment Verification') {
            steps {
                sh '''
                    echo "===== Environment ====="
                    node -v
                    npm -v
                    java -version
                    echo "JAVA_HOME=$JAVA_HOME"
                    echo "SONAR_SCANNER_JAVA_HOME=$SONAR_SCANNER_JAVA_HOME"
                    sonar-scanner --version
                    sdkmanager --version || true
                    adb version || true
                '''
            }
        }

        stage('Enable Yarn') {
            steps {
                sh '''
                    corepack enable
                    yarn --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    yarn --frozen-lockfile

                    cd package
                    yarn --frozen-lockfile
                    cd ..

                    cd package/native-package
                    yarn
                    cd ../..

                    cd ${APP_DIR}
                    yarn
                '''
            }
        }

        stage('Lint') {
            steps {
                dir("${APP_DIR}") {
                    sh 'yarn lint'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                echo "Skipping Jest tests due to known react-native-worklets compatibility issue."
            }
        }

        stage('Android Build') {
            steps {
                dir("${APP_DIR}/android") {
                    sh '''
                        chmod +x gradlew

                        ./gradlew assembleRelease \
                            --no-daemon \
                            --build-cache \
                            -Dorg.gradle.jvmargs="-Xmx2g -XX:MaxMetaspaceSize=512m" \
                            -PreactNativeArchitectures=arm64-v8a
                    '''
                }
            }

            post {
                success {
                    sh "cp ${APK_PATH} ${APP_DIR}/android/app/build/outputs/apk/release/${VERSIONED_APK_NAME}"
                    archiveArtifacts artifacts: "${APP_DIR}/android/app/build/outputs/apk/release/${VERSIONED_APK_NAME}", fingerprint: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        export JAVA_HOME=$SONAR_SCANNER_JAVA_HOME
                        export PATH=$JAVA_HOME/bin:$PATH
                        sonar-scanner \
                          -Dsonar.projectKey=react-native-chat-sampleapp \
                          -Dsonar.projectName="React Native Chat - SampleApp" \
                          -Dsonar.sources=src \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Upload APK to Azure Blob Storage') {
            steps {
                sh '''
                    az storage blob upload \
                      --connection-string "$AZURE_STORAGE_CONNECTION_STRING" \
                      --container-name "$AZURE_CONTAINER_NAME" \
                      --file "${APP_DIR}/android/app/build/outputs/apk/release/${VERSIONED_APK_NAME}" \
                      --name "$VERSIONED_APK_NAME" \
                      --overwrite
                '''
            }
        }

        stage('Fastlane') {
            steps {
                echo "Skipping Fastlane deployment."
            }
        }
    }

    post {

        success {
            echo "===================================="
            echo "Build Successful"
            echo "APK Built Successfully"
            echo "SonarQube Analysis Completed"
            echo "===================================="
        }

        failure {
            echo "===================================="
            echo "Build Failed"
            echo "Check logs above."
            echo "===================================="
        }

        always {
            sh '''
                echo "===== Disk Usage ====="
                df -h

                echo "===== Workspace Size ====="
                du -sh $WORKSPACE || true
            '''
        }
    }
}
